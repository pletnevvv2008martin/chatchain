import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  FortressData,
  RaceId,
  BuildingId,
  RACES,
  BUILDINGS,
  RESOURCES,
  createInitialFortress,
  loadFortressData,
  saveFortressData,
  collectResources,
  upgradeBuilding,
  calculateResourceProduction,
  calculateResourceLimits,
  calculateArmyPower,
  getFortressLevel,
  getFortressRating,
  getAllFortresses,
} from '@/lib/fortress';

// GET - получить данные крепости пользователя
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    // Получить все крепости для рейтинга
    if (action === 'leaderboard') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const allFortresses = getAllFortresses();
      const leaderboard = allFortresses.slice(0, limit).map((fortress, index) => ({
        rank: index + 1,
        userId: fortress.userId,
        userName: fortress.userName,
        race: fortress.race,
        raceEmoji: fortress.race ? RACES[fortress.race].emoji : '',
        level: getFortressLevel(fortress),
        rating: getFortressRating(fortress),
        armyPower: calculateArmyPower(fortress),
        castleLevel: fortress.buildings.castle || 0,
      }));

      return NextResponse.json({
        success: true,
        leaderboard,
      });
    }

    // Получить список рас
    if (action === 'races') {
      return NextResponse.json({
        success: true,
        races: Object.values(RACES),
      });
    }

    // Получить список зданий
    if (action === 'buildings') {
      return NextResponse.json({
        success: true,
        buildings: Object.values(BUILDINGS),
      });
    }

    // Получить данные крепости пользователя
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    let fortress = loadFortressData(userId);
    
    if (!fortress) {
      return NextResponse.json({
        success: true,
        fortress: null,
        hasFortress: false,
      });
    }

    // Собираем накопленные ресурсы
    fortress = collectResources(fortress);
    
    // Обновляем лимиты и силу армии
    const production = calculateResourceProduction(fortress);
    const limits = calculateResourceLimits(fortress);
    const armyPower = calculateArmyPower(fortress);
    const level = getFortressLevel(fortress);
    const rating = getFortressRating(fortress);

    // Сохраняем обновлённые данные
    saveFortressData(fortress);

    return NextResponse.json({
      success: true,
      fortress,
      hasFortress: true,
      stats: {
        production,
        limits,
        armyPower,
        level,
        rating,
      },
      race: fortress.race ? RACES[fortress.race] : null,
    });
  } catch (error) {
    console.error('GET fortress error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - создать крепость (выбор расы)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, raceId } = body;

    if (!userId || !userName || !raceId) {
      return NextResponse.json(
        { success: false, error: 'userId, userName and raceId are required' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли уже крепость
    const existingFortress = loadFortressData(userId);
    if (existingFortress) {
      return NextResponse.json(
        { success: false, error: 'Fortress already exists' },
        { status: 400 }
      );
    }

    // Проверяем валидность расы
    if (!RACES[raceId as RaceId]) {
      return NextResponse.json(
        { success: false, error: 'Invalid race' },
        { status: 400 }
      );
    }

    // Создаём новую крепость
    const fortress = createInitialFortress(userId, userName, raceId as RaceId);
    
    // Сохраняем
    const saved = saveFortressData(fortress);
    
    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Failed to save fortress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fortress,
      race: RACES[raceId as RaceId],
      message: `Крепость создана! Вы выбрали расу ${RACES[raceId as RaceId].name}`,
    });
  } catch (error) {
    console.error('POST fortress error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - улучшить здание, собрать ресурсы, обновить армию
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, buildingId, armyData } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    let fortress = loadFortressData(userId);
    
    if (!fortress) {
      return NextResponse.json(
        { success: false, error: 'Fortress not found' },
        { status: 404 }
      );
    }

    // Сначала собираем ресурсы
    fortress = collectResources(fortress);

    switch (action) {
      case 'upgrade_building': {
        if (!buildingId) {
          return NextResponse.json(
            { success: false, error: 'buildingId is required' },
            { status: 400 }
          );
        }

        const result = upgradeBuilding(fortress, buildingId as BuildingId);
        
        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.message,
            fortress,
          });
        }

        fortress = result.fortress;
        saveFortressData(fortress);

        return NextResponse.json({
          success: true,
          fortress,
          message: result.message,
          newLevel: fortress.buildings[buildingId as BuildingId],
        });
      }

      case 'collect_resources': {
        // Ресурсы уже собраны выше
        saveFortressData(fortress);

        const production = calculateResourceProduction(fortress);
        const limits = calculateResourceLimits(fortress);

        return NextResponse.json({
          success: true,
          fortress,
          production,
          limits,
          message: 'Ресурсы собраны',
        });
      }

      case 'update_army': {
        if (!armyData) {
          return NextResponse.json(
            { success: false, error: 'armyData is required' },
            { status: 400 }
          );
        }

        // Проверяем, хватает ли ресурсов и лимита армии
        const barracksLevel = fortress.buildings.barracks || 1;
        const maxArmySize = barracksLevel * 10;
        const totalArmy = (armyData.warriors || 0) + (armyData.archers || 0) + 
                         (armyData.cavalry || 0) + (armyData.mages || 0);

        if (totalArmy > maxArmySize) {
          return NextResponse.json({
            success: false,
            error: `Максимальный размер армии: ${maxArmySize} воинов`,
            fortress,
          });
        }

        // Проверяем еду для содержания
        const foodUpkeep = totalArmy * 0.1;
        const currentFood = fortress.resources.food || 0;
        
        if (foodUpkeep > currentFood * 0.5) {
          return NextResponse.json({
            success: false,
            error: 'Недостаточно еды для содержания армии',
            fortress,
          });
        }

        // Обновляем армию
        fortress.army = {
          ...fortress.army,
          ...armyData,
          totalPower: calculateArmyPower({ ...fortress, army: { ...fortress.army, ...armyData } }),
        };

        saveFortressData(fortress);

        return NextResponse.json({
          success: true,
          fortress,
          message: 'Армия обновлена',
          armyPower: fortress.army.totalPower,
        });
      }

      case 'train_units': {
        const { unitType, count } = body;
        
        if (!unitType || !count || count <= 0) {
          return NextResponse.json(
            { success: false, error: 'unitType and count (> 0) are required' },
            { status: 400 }
          );
        }

        // Стоимость обучения
        const costs: Record<string, Partial<Record<string, number>>> = {
          warriors: { gold: 50, food: 20 },
          archers: { gold: 75, wood: 30, food: 25 },
          cavalry: { gold: 150, food: 50, iron: 20 },
          mages: { gold: 200, mana: 30 },
        };

        const cost = costs[unitType];
        if (!cost) {
          return NextResponse.json(
            { success: false, error: 'Invalid unit type' },
            { status: 400 }
          );
        }

        // Проверяем ресурсы
        const totalCost: Partial<Record<string, number>> = {};
        for (const [resource, amount] of Object.entries(cost)) {
          totalCost[resource] = (amount || 0) * count;
          if ((fortress.resources[resource as keyof typeof fortress.resources] || 0) < (totalCost[resource] || 0)) {
            return NextResponse.json({
              success: false,
              error: `Недостаточно ${RESOURCES[resource as keyof typeof RESOURCES]?.name || resource}`,
              fortress,
            });
          }
        }

        // Проверяем лимит армии
        const barracksLevel = fortress.buildings.barracks || 1;
        const maxArmySize = barracksLevel * 10;
        const currentArmy = fortress.army.warriors + fortress.army.archers + 
                           fortress.army.cavalry + fortress.army.mages;
        
        if (currentArmy + count > maxArmySize) {
          return NextResponse.json({
            success: false,
            error: `Лимит армии: ${maxArmySize}. Можно обучить ещё ${maxArmySize - currentArmy} воинов`,
            fortress,
          });
        }

        // Вычитаем ресурсы и добавляем юнитов
        const updatedResources = { ...fortress.resources };
        for (const [resource, amount] of Object.entries(totalCost)) {
          updatedResources[resource as keyof typeof updatedResources] = 
            (updatedResources[resource as keyof typeof updatedResources] || 0) - (amount || 0);
        }

        fortress.resources = updatedResources;
        fortress.army[unitType as keyof typeof fortress.army] = 
          (fortress.army[unitType as keyof typeof fortress.army] as number) + count;
        fortress.army.totalPower = calculateArmyPower(fortress);

        saveFortressData(fortress);

        return NextResponse.json({
          success: true,
          fortress,
          message: `Обучено ${count} ${unitType === 'warriors' ? 'воинов' : unitType === 'archers' ? 'лучников' : unitType === 'cavalry' ? 'кавалеристов' : 'магов'}`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('PUT fortress error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - удалить крепость (только для тестирования/админов)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const adminKey = searchParams.get('adminKey');

    // Простая проверка (в реальном приложении нужна авторизация)
    if (adminKey !== 'fortress_admin_delete') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'data', 'fortress', `${userId}.json`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({
        success: true,
        message: 'Fortress deleted',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Fortress not found',
    });
  } catch (error) {
    console.error('DELETE fortress error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
