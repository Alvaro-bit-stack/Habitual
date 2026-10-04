import {randomInt} from 'node:crypto';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_PENDING = 50;
export const newCode = () => Array.from({length:8}, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
export const pair = (a, b) => a < b ? a + '|' + b : b + '|' + a;
