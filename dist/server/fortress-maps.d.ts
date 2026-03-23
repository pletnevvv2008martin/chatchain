export interface MapTemplate {
    id: string;
    name: string;
    description: string;
    theme: string;
    monsters: string[];
    resources: Record<string, number>;
    terrain: string[];
    bgColor: string;
    nodeColors: Record<string, string>;
}
export declare const FANTASY_MAPS: MapTemplate[];
export declare function getMapTemplate(mapId: string): MapTemplate | undefined;
export declare function getRandomMap(): MapTemplate;
//# sourceMappingURL=fortress-maps.d.ts.map