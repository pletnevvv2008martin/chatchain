import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// GIPHY API Key
const GIPHY_API_KEY = process.env.GIPHY_API_KEY || 'QEGUT4SELAbJbGAmOCibMesA0vG14NVV';

const CATEGORIES_MAP: Record<string, string> = {
  trending: '',
  reactions: 'reactions',
  funny: 'funny',
  love: 'love',
  celebrate: 'celebrate',
  animals: 'animals',
  cool: 'cool',
  memes: 'memes',
};

// Статические проверенные GIF
const STATIC_GIFS: Record<string, Array<{id: string, url: string, thumb: string, title: string}>> = {
  trending: [
    { id: 't1', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', thumb: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200.gif', title: 'Fire' },
    { id: 't2', url: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXe/giphy.gif', thumb: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXe/200.gif', title: 'Star' },
    { id: 't3', url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif', thumb: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/200.gif', title: 'Wow' },
    { id: 't4', url: 'https://media.giphy.com/media/26u4lMWSfyRt1yC9y/giphy.gif', thumb: 'https://media.giphy.com/media/26u4lMWSfyRt1yC9y/200.gif', title: 'Awesome' },
    { id: 't5', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', thumb: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/200.gif', title: 'LOL' },
    { id: 't6', url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif', thumb: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/200.gif', title: 'Cute' },
    { id: 't7', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', thumb: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/200.gif', title: 'Cool' },
    { id: 't8', url: 'https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/giphy.gif', thumb: 'https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/200.gif', title: 'Amazing' },
    { id: 't9', url: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif', thumb: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/200.gif', title: 'Fun' },
    { id: 't10', url: 'https://media.giphy.com/media/GeimqsH0TLDt4tScG9/giphy.gif', thumb: 'https://media.giphy.com/media/GeimqsH0TLDt4tScG9/200.gif', title: 'Nice' },
    { id: 't11', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', thumb: 'https://media.giphy.com/media/13HgwGsXF0aiGY/200.gif', title: 'Yay' },
    { id: 't12', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', thumb: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/200.gif', title: 'Cat' },
  ],
  reactions: [
    { id: 'r1', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', thumb: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/200.gif', title: 'Wow' },
    { id: 'r2', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', thumb: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/200.gif', title: 'Cool' },
    { id: 'r3', url: 'https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/giphy.gif', thumb: 'https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/200.gif', title: 'Clap' },
    { id: 'r4', url: 'https://media.giphy.com/media/xUPGcM5wTRBxKxnxIc/giphy.gif', thumb: 'https://media.giphy.com/media/xUPGcM5wTRBxKxnxIc/200.gif', title: 'OMG' },
    { id: 'r5', url: 'https://media.giphy.com/media/l3q2zbskZp2j8wniE/giphy.gif', thumb: 'https://media.giphy.com/media/l3q2zbskZp2j8wniE/200.gif', title: 'Shocked' },
    { id: 'r6', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', thumb: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/200.gif', title: 'Thumbs Up' },
    { id: 'r7', url: 'https://media.giphy.com/media/QRhtfYeRiTr3C/giphy.gif', thumb: 'https://media.giphy.com/media/QRhtfYeRiTr3C/200.gif', title: 'Applause' },
    { id: 'r8', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', thumb: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/200.gif', title: 'Celebrate' },
    { id: 'r9', url: 'https://media.giphy.com/media/xT9DPIBYf0pAviBLzO/giphy.gif', thumb: 'https://media.giphy.com/media/xT9DPIBYf0pAviBLzO/200.gif', title: 'Dance' },
    { id: 'r10', url: 'https://media.giphy.com/media/xUPGcM9wynRwMPuGoU/giphy.gif', thumb: 'https://media.giphy.com/media/xUPGcM9wynRwMPuGoU/200.gif', title: 'Cheers' },
    { id: 'r11', url: 'https://media.giphy.com/media/l0FwGzx0SXqPvLtEQ/giphy.gif', thumb: 'https://media.giphy.com/media/l0FwGzx0SXqPvLtEQ/200.gif', title: 'Fireworks' },
    { id: 'r12', url: 'https://media.giphy.com/media/3oz8xZvv7ZRk2VyJEA/giphy.gif', thumb: 'https://media.giphy.com/media/3oz8xZvv7ZRk2VyJEA/200.gif', title: 'Party' },
  ],
  funny: [
    { id: 'f1', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', thumb: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/200.gif', title: 'Laughing' },
    { id: 'f2', url: 'https://media.giphy.com/media/26BRBKpcUiH7Whq2k/giphy.gif', thumb: 'https://media.giphy.com/media/26BRBKpcUiH7Whq2k/200.gif', title: 'LOL' },
    { id: 'f3', url: 'https://media.giphy.com/media/l41lGvinEgARjB2HC/giphy.gif', thumb: 'https://media.giphy.com/media/l41lGvinEgARjB2HC/200.gif', title: 'Haha' },
    { id: 'f4', url: 'https://media.giphy.com/media/GeimqsH0TLDt4tScG9/giphy.gif', thumb: 'https://media.giphy.com/media/GeimqsH0TLDt4tScG9/200.gif', title: 'Comedy' },
    { id: 'f5', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', thumb: 'https://media.giphy.com/media/13HgwGsXF0aiGY/200.gif', title: 'Funny Cat' },
    { id: 'f6', url: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif', thumb: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/200.gif', title: 'LMAO' },
    { id: 'f7', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', thumb: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/200.gif', title: 'Crazy' },
    { id: 'f8', url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', thumb: 'https://media.giphy.com/media/mlvseq9yvZhba/200.gif', title: 'Silly' },
    { id: 'f9', url: 'https://media.giphy.com/media/mCRJDo24UvJMA/giphy.gif', thumb: 'https://media.giphy.com/media/mCRJDo24UvJMA/200.gif', title: 'Goofy' },
    { id: 'f10', url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif', thumb: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/200.gif', title: 'Cute Cat' },
    { id: 'f11', url: 'https://media.giphy.com/media/ND6xkVPaj8tHO/giphy.gif', thumb: 'https://media.giphy.com/media/ND6xkVPaj8tHO/200.gif', title: 'Panda' },
    { id: 'f12', url: 'https://media.giphy.com/media/13Cmju3maIjStW/giphy.gif', thumb: 'https://media.giphy.com/media/13Cmju3maIjStW/200.gif', title: 'Bunny' },
  ],
  love: [
    { id: 'l1', url: 'https://media.giphy.com/media/VP92phOZoZ6N6/giphy.gif', thumb: 'https://media.giphy.com/media/VP92phOZoZ6N6/200.gif', title: 'Love' },
    { id: 'l2', url: 'https://media.giphy.com/media/1L5YuA6wpKkNO/giphy.gif', thumb: 'https://media.giphy.com/media/1L5YuA6wpKkNO/200.gif', title: 'Hearts' },
    { id: 'l3', url: 'https://media.giphy.com/media/l0IylOPCkiYFdVFeE/giphy.gif', thumb: 'https://media.giphy.com/media/l0IylOPCkiYFdVFeE/200.gif', title: 'Romantic' },
    { id: 'l4', url: 'https://media.giphy.com/media/OyBCqvdlOwocE/giphy.gif', thumb: 'https://media.giphy.com/media/OyBCqvdlOwocE/200.gif', title: 'Heart Eyes' },
    { id: 'l5', url: 'https://media.giphy.com/media/lEXYjviWjvBrS/giphy.gif', thumb: 'https://media.giphy.com/media/lEXYjviWjvBrS/200.gif', title: 'Kiss' },
    { id: 'l6', url: 'https://media.giphy.com/media/26FLgGTPUDH6UGAbm/giphy.gif', thumb: 'https://media.giphy.com/media/26FLgGTPUDH6UGAbm/200.gif', title: 'Hugs' },
    { id: 'l7', url: 'https://media.giphy.com/media/wnU8Er5rLn5Xe/giphy.gif', thumb: 'https://media.giphy.com/media/wnU8Er5rLn5Xe/200.gif', title: 'Cute' },
    { id: 'l8', url: 'https://media.giphy.com/media/l1KVaj5UcbHwrBMqI/giphy.gif', thumb: 'https://media.giphy.com/media/l1KVaj5UcbHwrBMqI/200.gif', title: 'Sweet' },
    { id: 'l9', url: 'https://media.giphy.com/media/26BRuoMgs0L1T2q5K/giphy.gif', thumb: 'https://media.giphy.com/media/26BRuoMgs0L1T2q5K/200.gif', title: 'Together' },
    { id: 'l10', url: 'https://media.giphy.com/media/l3q2zbskZp2j8wniE/giphy.gif', thumb: 'https://media.giphy.com/media/l3q2zbskZp2j8wniE/200.gif', title: 'Heart' },
    { id: 'l11', url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif', thumb: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/200.gif', title: 'Love You' },
    { id: 'l12', url: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXe/giphy.gif', thumb: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXe/200.gif', title: 'Forever' },
  ],
  celebrate: [
    { id: 'c1', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', thumb: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/200.gif', title: 'Party' },
    { id: 'c2', url: 'https://media.giphy.com/media/3oz8xZvv7ZRk2VyJEA/giphy.gif', thumb: 'https://media.giphy.com/media/3oz8xZvv7ZRk2VyJEA/200.gif', title: 'Celebrate' },
    { id: 'c3', url: 'https://media.giphy.com/media/xT9DPIBYf0pAviBLzO/giphy.gif', thumb: 'https://media.giphy.com/media/xT9DPIBYf0pAviBLzO/200.gif', title: 'Dance' },
    { id: 'c4', url: 'https://media.giphy.com/media/xUPGcM9wynRwMPuGoU/giphy.gif', thumb: 'https://media.giphy.com/media/xUPGcM9wynRwMPuGoU/200.gif', title: 'Cheers' },
    { id: 'c5', url: 'https://media.giphy.com/media/QRhtfYeRiTr3C/giphy.gif', thumb: 'https://media.giphy.com/media/QRhtfYeRiTr3C/200.gif', title: 'Applause' },
    { id: 'c6', url: 'https://media.giphy.com/media/l0FwGzx0SXqPvLtEQ/giphy.gif', thumb: 'https://media.giphy.com/media/l0FwGzx0SXqPvLtEQ/200.gif', title: 'Fireworks' },
    { id: 'c7', url: 'https://media.giphy.com/media/3o7abKp8O9r4K6vYV6/giphy.gif', thumb: 'https://media.giphy.com/media/3o7abKp8O9r4K6vYV6/200.gif', title: 'Confetti' },
    { id: 'c8', url: 'https://media.giphy.com/media/26tPplGWjN0aLyYUg/giphy.gif', thumb: 'https://media.giphy.com/media/26tPplGWjN0aLyYUg/200.gif', title: 'Balloons' },
    { id: 'c9', url: 'https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/giphy.gif', thumb: 'https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/200.gif', title: 'Winner' },
    { id: 'c10', url: 'https://media.giphy.com/media/26u4lMWSfyRt1yC9y/giphy.gif', thumb: 'https://media.giphy.com/media/26u4lMWSfyRt1yC9y/200.gif', title: 'Happy' },
    { id: 'c11', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', thumb: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200.gif', title: 'Yay' },
    { id: 'c12', url: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXe/giphy.gif', thumb: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXe/200.gif', title: 'Success' },
  ],
  animals: [
    { id: 'a1', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', thumb: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/200.gif', title: 'Cat' },
    { id: 'a2', url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', thumb: 'https://media.giphy.com/media/mlvseq9yvZhba/200.gif', title: 'Dog' },
    { id: 'a3', url: 'https://media.giphy.com/media/mCRJDo24UvJMA/giphy.gif', thumb: 'https://media.giphy.com/media/mCRJDo24UvJMA/200.gif', title: 'Puppy' },
    { id: 'a4', url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif', thumb: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/200.gif', title: 'Kitten' },
    { id: 'a5', url: 'https://media.giphy.com/media/13Cmju3maIjStW/giphy.gif', thumb: 'https://media.giphy.com/media/13Cmju3maIjStW/200.gif', title: 'Bunny' },
    { id: 'a6', url: 'https://media.giphy.com/media/ND6xkVPaj8tHO/giphy.gif', thumb: 'https://media.giphy.com/media/ND6xkVPaj8tHO/200.gif', title: 'Panda' },
    { id: 'a7', url: 'https://media.giphy.com/media/l41lGvinEgARjB2HC/giphy.gif', thumb: 'https://media.giphy.com/media/l41lGvinEgARjB2HC/200.gif', title: 'Bird' },
    { id: 'a8', url: 'https://media.giphy.com/media/3oz8xZvv7ZRk2VyJEA/giphy.gif', thumb: 'https://media.giphy.com/media/3oz8xZvv7ZRk2VyJEA/200.gif', title: 'Fox' },
    { id: 'a9', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', thumb: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/200.gif', title: 'Bear' },
    { id: 'a10', url: 'https://media.giphy.com/media/GeimqsH0TLDt4tScG9/giphy.gif', thumb: 'https://media.giphy.com/media/GeimqsH0TLDt4tScG9/200.gif', title: 'Owl' },
    { id: 'a11', url: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif', thumb: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/200.gif', title: 'Penguin' },
    { id: 'a12', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', thumb: 'https://media.giphy.com/media/13HgwGsXF0aiGY/200.gif', title: 'Hamster' },
  ],
  cool: [
    { id: 'co1', url: 'https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/giphy.gif', thumb: 'https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/200.gif', title: 'Cool' },
    { id: 'co2', url: 'https://media.giphy.com/media/l0HlNQ03J5JxM6Cy4/giphy.gif', thumb: 'https://media.giphy.com/media/l0HlNQ03J5JxM6Cy4/200.gif', title: 'Sunglasses' },
    { id: 'co3', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', thumb: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/200.gif', title: 'Smooth' },
    { id: 'co4', url: 'https://media.giphy.com/media/l0HlK8vZqDg1ycgbG/giphy.gif', thumb: 'https://media.giphy.com/media/l0HlK8vZqDg1ycgbG/200.gif', title: 'Swag' },
    { id: 'co5', url: 'https://media.giphy.com/media/3o7TKsQ8MQv99Kq0Ew/giphy.gif', thumb: 'https://media.giphy.com/media/3o7TKsQ8MQv99Kq0Ew/200.gif', title: 'Style' },
    { id: 'co6', url: 'https://media.giphy.com/media/3oz8xLldTPCrflLdKs/giphy.gif', thumb: 'https://media.giphy.com/media/3oz8xLldTPCrflLdKs/200.gif', title: 'Awesome' },
    { id: 'co7', url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif', thumb: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/200.gif', title: 'Epic' },
    { id: 'co8', url: 'https://media.giphy.com/media/26BRBKpcUiH7Whq2k/giphy.gif', thumb: 'https://media.giphy.com/media/26BRBKpcUiH7Whq2k/200.gif', title: 'Dope' },
    { id: 'co9', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', thumb: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/200.gif', title: 'Fire' },
    { id: 'co10', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', thumb: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200.gif', title: 'Hot' },
    { id: 'co11', url: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXe/giphy.gif', thumb: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXe/200.gif', title: 'Star' },
    { id: 'co12', url: 'https://media.giphy.com/media/26u4lMWSfyRt1yC9y/giphy.gif', thumb: 'https://media.giphy.com/media/26u4lMWSfyRt1yC9y/200.gif', title: 'Legend' },
  ],
  memes: [
    { id: 'm1', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', thumb: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/200.gif', title: 'Meme 1' },
    { id: 'm2', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', thumb: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/200.gif', title: 'Meme 2' },
    { id: 'm3', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', thumb: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/200.gif', title: 'Meme 3' },
    { id: 'm4', url: 'https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/giphy.gif', thumb: 'https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/200.gif', title: 'Meme 4' },
    { id: 'm5', url: 'https://media.giphy.com/media/xUPGcM5wTRBxKxnxIc/giphy.gif', thumb: 'https://media.giphy.com/media/xUPGcM5wTRBxKxnxIc/200.gif', title: 'Meme 5' },
    { id: 'm6', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', thumb: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/200.gif', title: 'Meme 6' },
    { id: 'm7', url: 'https://media.giphy.com/media/l3q2zbskZp2j8wniE/giphy.gif', thumb: 'https://media.giphy.com/media/l3q2zbskZp2j8wniE/200.gif', title: 'Meme 7' },
    { id: 'm8', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', thumb: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/200.gif', title: 'Meme 8' },
    { id: 'm9', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', thumb: 'https://media.giphy.com/media/13HgwGsXF0aiGY/200.gif', title: 'Meme 9' },
    { id: 'm10', url: 'https://media.giphy.com/media/GeimqsH0TLDt4tScG9/giphy.gif', thumb: 'https://media.giphy.com/media/GeimqsH0TLDt4tScG9/200.gif', title: 'Meme 10' },
    { id: 'm11', url: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif', thumb: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/200.gif', title: 'Meme 11' },
    { id: 'm12', url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', thumb: 'https://media.giphy.com/media/mlvseq9yvZhba/200.gif', title: 'Meme 12' },
  ],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const query = searchParams.get('query');
  const limit = parseInt(searchParams.get('limit') || '20');

  let category = 'trending';
  
  if (action === 'search' && query) {
    category = query.toLowerCase();
  }

  // Если есть API ключ GIPHY - пробуем получить живые данные
  if (GIPHY_API_KEY) {
    try {
      let apiUrl: string;
      
      if (action === 'trending') {
        apiUrl = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=g`;
      } else if (query) {
        apiUrl = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`;
      } else {
        apiUrl = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=g`;
      }

      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        const gifs = data.data?.map((item: any) => ({
          id: item.id,
          url: item.images.original.url,
          thumb: item.images.fixed_height_small?.url || item.images.fixed_height?.url || item.images.preview?.url,
          title: item.title || 'GIF',
        })) || [];

        return NextResponse.json({ 
          data: gifs,
          source: 'giphy' 
        });
      }
    } catch (error) {
      console.error('GIPHY API error:', error);
    }
  }

  // Проверяем локальные GIF в /public/gifs/{category}/
  try {
    const localGifPath = path.join(process.cwd(), 'public', 'gifs', category);
    
    if (existsSync(localGifPath)) {
      const files = await readdir(localGifPath);
      const gifFiles = files.filter(f => f.endsWith('.gif'));
      
      if (gifFiles.length > 0) {
        const localGifs = gifFiles.map((file, index) => ({
          id: `local_${category}_${index}`,
          url: `/gifs/${category}/${file}`,
          thumb: `/gifs/${category}/${file}`,
          title: file.replace('.gif', '').replace(/[-_]/g, ' '),
        }));
        
        return NextResponse.json({ 
          data: localGifs,
          source: 'local' 
        });
      }
    }
  } catch (error) {
    // Локальные файлы не найдены, используем статические
  }

  // Fallback на статические GIF с прокси
  const staticGifs = STATIC_GIFS[category] || STATIC_GIFS.trending;
  
  const gifsWithProxy = staticGifs.map(gif => ({
    ...gif,
    // Добавляем прокси URL как fallback
    proxyThumb: `/api/gif-proxy?url=${encodeURIComponent(gif.thumb)}`,
  }));

  return NextResponse.json({ 
    data: gifsWithProxy,
    source: 'static' 
  });
}
