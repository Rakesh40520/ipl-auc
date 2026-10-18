import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rawPlayers = [
  // --- MARQUEE SET 1 ---
  { name: "Rishabh Pant", role: "WK-Batter", country: "India", basePrice: 200, set: "M1", setName: "Marquee Set 1", isCapped: true, stats: { matches: 111, runs: 3284, sr: 148.5, hs: "128*" } },
  { name: "Shreyas Iyer", role: "Batter", country: "India", basePrice: 200, set: "M1", setName: "Marquee Set 1", isCapped: true, stats: { matches: 116, runs: 3127, sr: 127.5, hs: "96" } },
  { name: "KL Rahul", role: "WK-Batter", country: "India", basePrice: 200, set: "M1", setName: "Marquee Set 1", isCapped: true, stats: { matches: 132, runs: 4683, sr: 134.6, hs: "132*" } },
  { name: "Arshdeep Singh", role: "Bowler", country: "India", basePrice: 200, set: "M1", setName: "Marquee Set 1", isCapped: true, stats: { matches: 65, wkts: 76, econ: 8.74, bb: "5/32" } },
  { name: "Mitchell Starc", role: "Bowler", country: "Australia", basePrice: 200, set: "M1", setName: "Marquee Set 1", isCapped: true, stats: { matches: 41, wkts: 51, econ: 8.21, bb: "4/15" } },
  { name: "Jos Buttler", role: "WK-Batter", country: "England", basePrice: 200, set: "M1", setName: "Marquee Set 1", isCapped: true, stats: { matches: 107, runs: 3582, sr: 147.5, hs: "124" } },
  { name: "Kagiso Rabada", role: "Bowler", country: "South Africa", basePrice: 200, set: "M1", setName: "Marquee Set 1", isCapped: true, stats: { matches: 80, wkts: 117, econ: 8.42, bb: "4/21" } },
  { name: "Yuzvendra Chahal", role: "Bowler", country: "India", basePrice: 200, set: "M1", setName: "Marquee Set 1", isCapped: true, stats: { matches: 160, wkts: 205, econ: 7.84, bb: "5/40" } },
  { name: "Mohammed Shami", role: "Bowler", country: "India", basePrice: 200, set: "M1", setName: "Marquee Set 1", isCapped: true, stats: { matches: 110, wkts: 127, econ: 8.44, bb: "4/11" } },
  { name: "Liam Livingstone", role: "All-Rounder", country: "England", basePrice: 200, set: "M1", setName: "Marquee Set 1", isCapped: true, stats: { matches: 39, runs: 939, sr: 162.5, wkts: 11 } },

  // --- MARQUEE SET 2 ---
  { name: "David Miller", role: "Batter", country: "South Africa", basePrice: 150, set: "M2", setName: "Marquee Set 2", isCapped: true, stats: { matches: 130, runs: 2924, sr: 139.3, hs: "101*" } },
  { name: "Glenn Maxwell", role: "All-Rounder", country: "Australia", basePrice: 200, set: "M2", setName: "Marquee Set 2", isCapped: true, stats: { matches: 134, runs: 2771, sr: 156.7, wkts: 37 } },
  { name: "Mohammed Siraj", role: "Bowler", country: "India", basePrice: 200, set: "M2", setName: "Marquee Set 2", isCapped: true, stats: { matches: 93, wkts: 93, econ: 8.65, bb: "4/21" } },
  { name: "Ravichandran Ashwin", role: "All-Rounder", country: "India", basePrice: 200, set: "M2", setName: "Marquee Set 2", isCapped: true, stats: { matches: 212, wkts: 180, econ: 7.12, runs: 800 } },
  { name: "Faf du Plessis", role: "Batter", country: "South Africa", basePrice: 200, set: "M2", setName: "Marquee Set 2", isCapped: true, stats: { matches: 145, runs: 4571, sr: 136.4, hs: "96" } },
  { name: "Devon Conway", role: "WK-Batter", country: "New Zealand", basePrice: 200, set: "M2", setName: "Marquee Set 2", isCapped: true, stats: { matches: 23, runs: 924, sr: 141.3, hs: "92*" } },
  { name: "Trent Boult", role: "Bowler", country: "New Zealand", basePrice: 200, set: "M2", setName: "Marquee Set 2", isCapped: true, stats: { matches: 104, wkts: 121, econ: 8.29, bb: "4/18" } },
  { name: "Quinton de Kock", role: "WK-Batter", country: "South Africa", basePrice: 200, set: "M2", setName: "Marquee Set 2", isCapped: true, stats: { matches: 107, runs: 3157, sr: 134.2, hs: "140*" } },
  { name: "Bhuvneshwar Kumar", role: "Bowler", country: "India", basePrice: 200, set: "M2", setName: "Marquee Set 2", isCapped: true, stats: { matches: 176, wkts: 181, econ: 7.56, bb: "5/19" } },
  { name: "Marcus Stoinis", role: "All-Rounder", country: "Australia", basePrice: 200, set: "M2", setName: "Marquee Set 2", isCapped: true, stats: { matches: 96, runs: 1866, sr: 142.0, wkts: 43 } },

  // --- CAPPED BATTERS SET 1 (BA1) ---
  { name: "Harry Brook", role: "Batter", country: "England", basePrice: 200, set: "BA1", setName: "Capped Batters Set 1", isCapped: true, stats: { matches: 11, runs: 190, sr: 123.4, hs: "100*" } },
  { name: "Rahul Tripathi", role: "Batter", country: "India", basePrice: 75, set: "BA1", setName: "Capped Batters Set 1", isCapped: true, stats: { matches: 95, runs: 2236, sr: 139.2, hs: "93" } },
  { name: "Devdutt Padikkal", role: "Batter", country: "India", basePrice: 200, set: "BA1", setName: "Capped Batters Set 1", isCapped: true, stats: { matches: 64, runs: 1560, sr: 123.8, hs: "101*" } },
  { name: "David Warner", role: "Batter", country: "Australia", basePrice: 200, set: "BA1", setName: "Capped Batters Set 1", isCapped: true, stats: { matches: 184, runs: 6565, sr: 139.8, hs: "126" } },
  { name: "Kane Williamson", role: "Batter", country: "New Zealand", basePrice: 200, set: "BA1", setName: "Capped Batters Set 1", isCapped: true, stats: { matches: 79, runs: 2128, sr: 126.1, hs: "89" } },
  { name: "Prithvi Shaw", role: "Batter", country: "India", basePrice: 75, set: "BA1", setName: "Capped Batters Set 1", isCapped: true, stats: { matches: 79, runs: 1892, sr: 147.5, hs: "99" } },
  { name: "Mayank Agarwal", role: "Batter", country: "India", basePrice: 100, set: "BA1", setName: "Capped Batters Set 1", isCapped: true, stats: { matches: 127, runs: 2661, sr: 133.6, hs: "106" } },
  { name: "Manish Pandey", role: "Batter", country: "India", basePrice: 75, set: "BA1", setName: "Capped Batters Set 1", isCapped: true, stats: { matches: 171, runs: 3850, sr: 121.1, hs: "114*" } },
  { name: "Glenn Phillips", role: "Batter", country: "New Zealand", basePrice: 200, set: "BA1", setName: "Capped Batters Set 1", isCapped: true, stats: { matches: 8, runs: 64, sr: 142.2, hs: "25" } },
  { name: "Steve Smith", role: "Batter", country: "Australia", basePrice: 200, set: "BA1", setName: "Capped Batters Set 1", isCapped: true, stats: { matches: 103, runs: 2485, sr: 128.1, hs: "101" } },

  // --- CAPPED ALL-ROUNDERS SET 1 (AL1) ---
  { name: "Sam Curran", role: "All-Rounder", country: "England", basePrice: 200, set: "AL1", setName: "Capped All-Rounders Set 1", isCapped: true, stats: { matches: 59, runs: 883, sr: 143.1, wkts: 58 } },
  { name: "Venkatesh Iyer", role: "All-Rounder", country: "India", basePrice: 200, set: "AL1", setName: "Capped All-Rounders Set 1", isCapped: true, stats: { matches: 51, runs: 1326, sr: 137.1, wkts: 3 } },
  { name: "Washington Sundar", role: "All-Rounder", country: "India", basePrice: 200, set: "AL1", setName: "Capped All-Rounders Set 1", isCapped: true, stats: { matches: 60, runs: 378, wkts: 37, econ: 7.54 } },
  { name: "Wanindu Hasaranga", role: "All-Rounder", country: "Sri Lanka", basePrice: 200, set: "AL1", setName: "Capped All-Rounders Set 1", isCapped: true, stats: { matches: 26, wkts: 35, econ: 8.13, runs: 72 } },
  { name: "Krunal Pandya", role: "All-Rounder", country: "India", basePrice: 200, set: "AL1", setName: "Capped All-Rounders Set 1", isCapped: true, stats: { matches: 127, runs: 1647, sr: 133.4, wkts: 76 } },
  { name: "Shardul Thakur", role: "All-Rounder", country: "India", basePrice: 200, set: "AL1", setName: "Capped All-Rounders Set 1", isCapped: true, stats: { matches: 95, wkts: 94, econ: 9.23, runs: 303 } },
  { name: "Deepak Chahar", role: "All-Rounder", country: "India", basePrice: 200, set: "AL1", setName: "Capped All-Rounders Set 1", isCapped: true, stats: { matches: 81, wkts: 77, econ: 7.98, bb: "4/13" } },
  { name: "Nitish Rana", role: "All-Rounder", country: "India", basePrice: 150, set: "AL1", setName: "Capped All-Rounders Set 1", isCapped: true, stats: { matches: 107, runs: 2636, sr: 135.3, wkts: 10 } },
  { name: "Mitchell Marsh", role: "All-Rounder", country: "Australia", basePrice: 200, set: "AL1", setName: "Capped All-Rounders Set 1", isCapped: true, stats: { matches: 42, runs: 666, sr: 125.2, wkts: 37 } },
  { name: "Rachin Ravindra", role: "All-Rounder", country: "New Zealand", basePrice: 150, set: "AL1", setName: "Capped All-Rounders Set 1", isCapped: true, stats: { matches: 10, runs: 222, sr: 160.9, wkts: 0 } },
  { name: "Daryl Mitchell", role: "All-Rounder", country: "New Zealand", basePrice: 200, set: "AL1", setName: "Capped All-Rounders Set 1", isCapped: true, stats: { matches: 15, runs: 351, sr: 136.6, wkts: 1 } },
  { name: "Moeen Ali", role: "All-Rounder", country: "England", basePrice: 200, set: "AL1", setName: "Capped All-Rounders Set 1", isCapped: true, stats: { matches: 67, runs: 1162, sr: 141.5, wkts: 35 } },

  // --- CAPPED WICKETKEEPERS SET 1 (WK1) ---
  { name: "Ishan Kishan", role: "WK-Batter", country: "India", basePrice: 200, set: "WK1", setName: "Capped Wicketkeepers Set 1", isCapped: true, stats: { matches: 105, runs: 2644, sr: 135.9, hs: "99" } },
  { name: "Phil Salt", role: "WK-Batter", country: "England", basePrice: 200, set: "WK1", setName: "Capped Wicketkeepers Set 1", isCapped: true, stats: { matches: 21, runs: 653, sr: 175.5, hs: "89*" } },
  { name: "Jitesh Sharma", role: "WK-Batter", country: "India", basePrice: 100, set: "WK1", setName: "Capped Wicketkeepers Set 1", isCapped: true, stats: { matches: 40, runs: 730, sr: 151.1, hs: "49*" } },
  { name: "Jonny Bairstow", role: "WK-Batter", country: "England", basePrice: 200, set: "WK1", setName: "Capped Wicketkeepers Set 1", isCapped: true, stats: { matches: 50, runs: 1589, sr: 144.2, hs: "114" } },
  { name: "Rahmanullah Gurbaz", role: "WK-Batter", country: "Afghanistan", basePrice: 200, set: "WK1", setName: "Capped Wicketkeepers Set 1", isCapped: true, stats: { matches: 13, runs: 289, sr: 133.8, hs: "81" } },
  { name: "Anuj Rawat", role: "WK-Batter", country: "India", basePrice: 30, set: "WK1", setName: "Capped Wicketkeepers Set 1", isCapped: true, stats: { matches: 24, runs: 318, sr: 119.5, hs: "66" } },
  { name: "KS Bharat", role: "WK-Batter", country: "India", basePrice: 75, set: "WK1", setName: "Capped Wicketkeepers Set 1", isCapped: true, stats: { matches: 10, runs: 199, sr: 122.1, hs: "78*" } },
  { name: "Shai Hope", role: "WK-Batter", country: "West Indies", basePrice: 125, set: "WK1", setName: "Capped Wicketkeepers Set 1", isCapped: true, stats: { matches: 9, runs: 183, sr: 150.0, hs: "41" } },
  { name: "Ryan Rickelton", role: "WK-Batter", country: "South Africa", basePrice: 100, set: "WK1", setName: "Capped Wicketkeepers Set 1", isCapped: true, stats: { matches: 0, runs: 0, sr: 142.8, hs: "T20I" } },
  { name: "Alex Carey", role: "WK-Batter", country: "Australia", basePrice: 100, set: "WK1", setName: "Capped Wicketkeepers Set 1", isCapped: true, stats: { matches: 6, runs: 65, sr: 110.2, hs: "35*" } },

  // --- CAPPED FAST BOWLERS SET 1 (FA1) ---
  { name: "Khaleel Ahmed", role: "Bowler", country: "India", basePrice: 200, set: "FA1", setName: "Capped Fast Bowlers Set 1", isCapped: true, stats: { matches: 57, wkts: 74, econ: 8.81, bb: "3/25" } },
  { name: "Avesh Khan", role: "Bowler", country: "India", basePrice: 200, set: "FA1", setName: "Capped Fast Bowlers Set 1", isCapped: true, stats: { matches: 63, wkts: 75, econ: 8.89, bb: "4/24" } },
  { name: "Prasidh Krishna", role: "Bowler", country: "India", basePrice: 200, set: "FA1", setName: "Capped Fast Bowlers Set 1", isCapped: true, stats: { matches: 51, wkts: 49, econ: 8.92, bb: "4/30" } },
  { name: "T Natarajan", role: "Bowler", country: "India", basePrice: 200, set: "FA1", setName: "Capped Fast Bowlers Set 1", isCapped: true, stats: { matches: 61, wkts: 67, econ: 8.78, bb: "4/19" } },
  { name: "Josh Hazlewood", role: "Bowler", country: "Australia", basePrice: 200, set: "FA1", setName: "Capped Fast Bowlers Set 1", isCapped: true, stats: { matches: 27, wkts: 35, econ: 8.06, bb: "4/25" } },
  { name: "Anrich Nortje", role: "Bowler", country: "South Africa", basePrice: 200, set: "FA1", setName: "Capped Fast Bowlers Set 1", isCapped: true, stats: { matches: 46, wkts: 60, econ: 8.96, bb: "3/33" } },
  { name: "Gerald Coetzee", role: "Bowler", country: "South Africa", basePrice: 125, set: "FA1", setName: "Capped Fast Bowlers Set 1", isCapped: true, stats: { matches: 10, wkts: 13, econ: 10.18, bb: "4/34" } },
  { name: "Lockie Ferguson", role: "Bowler", country: "New Zealand", basePrice: 200, set: "FA1", setName: "Capped Fast Bowlers Set 1", isCapped: true, stats: { matches: 45, wkts: 46, econ: 8.85, bb: "4/28" } },
  { name: "Alzarri Joseph", role: "Bowler", country: "West Indies", basePrice: 150, set: "FA1", setName: "Capped Fast Bowlers Set 1", isCapped: true, stats: { matches: 22, wkts: 21, econ: 9.38, bb: "6/12" } },
  { name: "Naveen-ul-Haq", role: "Bowler", country: "Afghanistan", basePrice: 200, set: "FA1", setName: "Capped Fast Bowlers Set 1", isCapped: true, stats: { matches: 18, wkts: 25, econ: 9.54, bb: "4/38" } },
  { name: "Spencer Johnson", role: "Bowler", country: "Australia", basePrice: 200, set: "FA1", setName: "Capped Fast Bowlers Set 1", isCapped: true, stats: { matches: 5, wkts: 4, econ: 9.33, bb: "2/25" } },
  { name: "Mukesh Kumar", role: "Bowler", country: "India", basePrice: 200, set: "FA1", setName: "Capped Fast Bowlers Set 1", isCapped: true, stats: { matches: 20, wkts: 24, econ: 10.42, bb: "3/14" } },

  // --- CAPPED SPINNERS SET 1 (SP1) ---
  { name: "Noor Ahmad", role: "Bowler", country: "Afghanistan", basePrice: 200, set: "SP1", setName: "Capped Spinners Set 1", isCapped: true, stats: { matches: 23, wkts: 24, econ: 8.04, bb: "3/37" } },
  { name: "Maheesh Theekshana", role: "Bowler", country: "Sri Lanka", basePrice: 200, set: "SP1", setName: "Capped Spinners Set 1", isCapped: true, stats: { matches: 27, wkts: 25, econ: 7.66, bb: "4/33" } },
  { name: "Rahul Chahar", role: "Bowler", country: "India", basePrice: 100, set: "SP1", setName: "Capped Spinners Set 1", isCapped: true, stats: { matches: 78, wkts: 75, econ: 7.61, bb: "4/27" } },
  { name: "Adam Zampa", role: "Bowler", country: "Australia", basePrice: 200, set: "SP1", setName: "Capped Spinners Set 1", isCapped: true, stats: { matches: 20, wkts: 29, econ: 7.99, bb: "6/19" } },
  { name: "Suyash Sharma", role: "Bowler", country: "India", basePrice: 30, set: "SP1", setName: "Capped Spinners Set 1", isCapped: true, stats: { matches: 13, wkts: 11, econ: 8.35, bb: "3/30" } },
  { name: "Karn Sharma", role: "Bowler", country: "India", basePrice: 50, set: "SP1", setName: "Capped Spinners Set 1", isCapped: true, stats: { matches: 84, wkts: 76, econ: 8.32, bb: "4/16" } },
  { name: "Mujeeb Ur Rahman", role: "Bowler", country: "Afghanistan", basePrice: 200, set: "SP1", setName: "Capped Spinners Set 1", isCapped: true, stats: { matches: 19, wkts: 19, econ: 8.18, bb: "3/27" } },
  { name: "Piyush Chawla", role: "Bowler", country: "India", basePrice: 50, set: "SP1", setName: "Capped Spinners Set 1", isCapped: true, stats: { matches: 192, wkts: 192, econ: 7.96, bb: "4/17" } },
  { name: "Tabraiz Shamsi", role: "Bowler", country: "South Africa", basePrice: 100, set: "SP1", setName: "Capped Spinners Set 1", isCapped: true, stats: { matches: 5, wkts: 3, econ: 9.05, bb: "1/21" } },
  { name: "Adil Rashid", role: "Bowler", country: "England", basePrice: 200, set: "SP1", setName: "Capped Spinners Set 1", isCapped: true, stats: { matches: 3, wkts: 2, econ: 9.25, bb: "2/33" } },

  // --- UNCAPPED BATTERS SET 1 (UBA1) ---
  { name: "Angkrish Raghuvanshi", role: "Batter", country: "India", basePrice: 30, set: "UBA1", setName: "Uncapped Batters Set 1", isCapped: false, stats: { matches: 10, runs: 163, sr: 155.2, hs: "54" } },
  { name: "Nehal Wadhera", role: "Batter", country: "India", basePrice: 30, set: "UBA1", setName: "Uncapped Batters Set 1", isCapped: false, stats: { matches: 20, runs: 350, sr: 141.7, hs: "64" } },
  { name: "Sameer Rizvi", role: "Batter", country: "India", basePrice: 30, set: "UBA1", setName: "Uncapped Batters Set 1", isCapped: false, stats: { matches: 8, runs: 51, sr: 118.6, hs: "21" } },
  { name: "Ashutosh Sharma", role: "Batter", country: "India", basePrice: 30, set: "UBA1", setName: "Uncapped Batters Set 1", isCapped: false, stats: { matches: 11, runs: 189, sr: 167.3, hs: "61" } },
  { name: "Abhinav Manohar", role: "Batter", country: "India", basePrice: 30, set: "UBA1", setName: "Uncapped Batters Set 1", isCapped: false, stats: { matches: 17, runs: 231, sr: 140.0, hs: "43" } },
  { name: "Priyansh Arya", role: "Batter", country: "India", basePrice: 30, set: "UBA1", setName: "Uncapped Batters Set 1", isCapped: false, stats: { matches: 0, runs: 0, sr: 162.0, hs: "DPL 120" } },
  { name: "Swastik Chikara", role: "Batter", country: "India", basePrice: 30, set: "UBA1", setName: "Uncapped Batters Set 1", isCapped: false, stats: { matches: 0, runs: 0, sr: 155.0, hs: "UPT20 100" } },
  { name: "Ayush Badoni", role: "Batter", country: "India", basePrice: 40, set: "UBA1", setName: "Uncapped Batters Set 1", isCapped: false, stats: { matches: 42, runs: 634, sr: 132.1, hs: "59" } },
  { name: "Abdul Samad", role: "Batter", country: "India", basePrice: 40, set: "UBA1", setName: "Uncapped Batters Set 1", isCapped: false, stats: { matches: 50, runs: 577, sr: 146.1, hs: "38" } },
  { name: "Anmolpreet Singh", role: "Batter", country: "India", basePrice: 30, set: "UBA1", setName: "Uncapped Batters Set 1", isCapped: false, stats: { matches: 11, runs: 201, sr: 131.4, hs: "36" } },

  // --- UNCAPPED ALL-ROUNDERS SET 1 (UAL1) ---
  { name: "Shashank Singh", role: "All-Rounder", country: "India", basePrice: 40, set: "UAL1", setName: "Uncapped All-Rounders Set 1", isCapped: false, stats: { matches: 24, runs: 423, sr: 160.8, hs: "68*" } },
  { name: "Ramandeep Singh", role: "All-Rounder", country: "India", basePrice: 30, set: "UAL1", setName: "Uncapped All-Rounders Set 1", isCapped: false, stats: { matches: 20, runs: 170, sr: 170.0, wkts: 6 } },
  { name: "Shahrukh Khan", role: "All-Rounder", country: "India", basePrice: 40, set: "UAL1", setName: "Uncapped All-Rounders Set 1", isCapped: false, stats: { matches: 40, runs: 553, sr: 138.6, hs: "58" } },
  { name: "Naman Dhir", role: "All-Rounder", country: "India", basePrice: 30, set: "UAL1", setName: "Uncapped All-Rounders Set 1", isCapped: false, stats: { matches: 7, runs: 140, sr: 166.7, hs: "62*" } },
  { name: "Arshin Kulkarni", role: "All-Rounder", country: "India", basePrice: 30, set: "UAL1", setName: "Uncapped All-Rounders Set 1", isCapped: false, stats: { matches: 2, runs: 9, sr: 75.0, wkts: 0 } },
  { name: "Nishant Sindhu", role: "All-Rounder", country: "India", basePrice: 30, set: "UAL1", setName: "Uncapped All-Rounders Set 1", isCapped: false, stats: { matches: 0, runs: 0, sr: 130.0, wkts: 12 } },
  { name: "Harpreet Brar", role: "All-Rounder", country: "India", basePrice: 40, set: "UAL1", setName: "Uncapped All-Rounders Set 1", isCapped: false, stats: { matches: 41, wkts: 25, econ: 7.91, runs: 205 } },
  { name: "Swapnil Singh", role: "All-Rounder", country: "India", basePrice: 30, set: "UAL1", setName: "Uncapped All-Rounders Set 1", isCapped: false, stats: { matches: 12, wkts: 7, econ: 8.78, runs: 45 } },
  { name: "Raj Bawa", role: "All-Rounder", country: "India", basePrice: 30, set: "UAL1", setName: "Uncapped All-Rounders Set 1", isCapped: false, stats: { matches: 2, runs: 11, sr: 78.5, wkts: 0 } },
  { name: "Mahipal Lomror", role: "All-Rounder", country: "India", basePrice: 40, set: "UAL1", setName: "Uncapped All-Rounders Set 1", isCapped: false, stats: { matches: 40, runs: 527, sr: 136.2, hs: "47" } },
  { name: "Sanvir Singh", role: "All-Rounder", country: "India", basePrice: 30, set: "UAL1", setName: "Uncapped All-Rounders Set 1", isCapped: false, stats: { matches: 8, runs: 41, sr: 151.8, wkts: 1 } },
  { name: "Vivrant Sharma", role: "All-Rounder", country: "India", basePrice: 30, set: "UAL1", setName: "Uncapped All-Rounders Set 1", isCapped: false, stats: { matches: 3, runs: 69, sr: 146.8, hs: "69" } },

  // --- UNCAPPED WICKETKEEPERS SET 1 (UWK1) ---
  { name: "Kumar Kushagra", role: "WK-Batter", country: "India", basePrice: 30, set: "UWK1", setName: "Uncapped Wicketkeepers Set 1", isCapped: false, stats: { matches: 4, runs: 3, sr: 33.3, hs: "3" } },
  { name: "Robin Minz", role: "WK-Batter", country: "India", basePrice: 30, set: "UWK1", setName: "Uncapped Wicketkeepers Set 1", isCapped: false, stats: { matches: 0, runs: 0, sr: 155.0, hs: "Domestic" } },
  { name: "Urvil Patel", role: "WK-Batter", country: "India", basePrice: 30, set: "UWK1", setName: "Uncapped Wicketkeepers Set 1", isCapped: false, stats: { matches: 0, runs: 0, sr: 165.0, hs: "SMAT 100" } },
  { name: "Luvnith Sisodia", role: "WK-Batter", country: "India", basePrice: 30, set: "UWK1", setName: "Uncapped Wicketkeepers Set 1", isCapped: false, stats: { matches: 0, runs: 0, sr: 140.0, hs: "KPL" } },
  { name: "Vishnu Vinod", role: "WK-Batter", country: "India", basePrice: 30, set: "UWK1", setName: "Uncapped Wicketkeepers Set 1", isCapped: false, stats: { matches: 6, runs: 56, sr: 124.4, hs: "32" } },
  { name: "Upendra Yadav", role: "WK-Batter", country: "India", basePrice: 30, set: "UWK1", setName: "Uncapped Wicketkeepers Set 1", isCapped: false, stats: { matches: 0, runs: 0, sr: 128.0, hs: "Ranji" } },
  { name: "Aryan Juyal", role: "WK-Batter", country: "India", basePrice: 30, set: "UWK1", setName: "Uncapped Wicketkeepers Set 1", isCapped: false, stats: { matches: 0, runs: 0, sr: 135.0, hs: "SMAT" } },
  { name: "Bipin Saurabh", role: "WK-Batter", country: "India", basePrice: 30, set: "UWK1", setName: "Uncapped Wicketkeepers Set 1", isCapped: false, stats: { matches: 0, runs: 0, sr: 144.0, hs: "Domestic" } },
  { name: "Donovan Ferreira", role: "WK-Batter", country: "South Africa", basePrice: 50, set: "UWK1", setName: "Uncapped Wicketkeepers Set 1", isCapped: false, stats: { matches: 2, runs: 8, sr: 160.0, hs: "7" } },
  { name: "Harvik Desai", role: "WK-Batter", country: "India", basePrice: 30, set: "UWK1", setName: "Uncapped Wicketkeepers Set 1", isCapped: false, stats: { matches: 2, runs: 18, sr: 90.0, hs: "18" } },

  // --- UNCAPPED FAST BOWLERS SET 1 (UFA1) ---
  { name: "Mayank Yadav", role: "Bowler", country: "India", basePrice: 40, set: "UFA1", setName: "Uncapped Fast Bowlers Set 1", isCapped: false, stats: { matches: 4, wkts: 7, econ: 6.98, bb: "3/14" } },
  { name: "Rasikh Salam", role: "Bowler", country: "India", basePrice: 30, set: "UFA1", setName: "Uncapped Fast Bowlers Set 1", isCapped: false, stats: { matches: 11, wkts: 10, econ: 10.22, bb: "3/34" } },
  { name: "Harshit Rana", role: "Bowler", country: "India", basePrice: 40, set: "UFA1", setName: "Uncapped Fast Bowlers Set 1", isCapped: false, stats: { matches: 21, wkts: 25, econ: 9.05, bb: "3/24" } },
  { name: "Mohit Sharma", role: "Bowler", country: "India", basePrice: 50, set: "UFA1", setName: "Uncapped Fast Bowlers Set 1", isCapped: true, stats: { matches: 112, wkts: 132, econ: 8.62, bb: "5/10" } },
  { name: "Kartik Tyagi", role: "Bowler", country: "India", basePrice: 30, set: "UFA1", setName: "Uncapped Fast Bowlers Set 1", isCapped: false, stats: { matches: 19, wkts: 15, econ: 9.98, bb: "4/29" } },
  { name: "Vaibhav Arora", role: "Bowler", country: "India", basePrice: 30, set: "UFA1", setName: "Uncapped Fast Bowlers Set 1", isCapped: false, stats: { matches: 17, wkts: 16, econ: 9.54, bb: "3/27" } },
  { name: "Simarjeet Singh", role: "Bowler", country: "India", basePrice: 30, set: "UFA1", setName: "Uncapped Fast Bowlers Set 1", isCapped: false, stats: { matches: 10, wkts: 9, econ: 8.92, bb: "3/26" } },
  { name: "Yash Dayal", role: "Bowler", country: "India", basePrice: 40, set: "UFA1", setName: "Uncapped Fast Bowlers Set 1", isCapped: false, stats: { matches: 28, wkts: 28, econ: 9.45, bb: "3/20" } },
  { name: "Vijaykumar Vyshak", role: "Bowler", country: "India", basePrice: 30, set: "UFA1", setName: "Uncapped Fast Bowlers Set 1", isCapped: false, stats: { matches: 11, wkts: 13, econ: 10.15, bb: "3/23" } },
  { name: "Sushant Mishra", role: "Bowler", country: "India", basePrice: 30, set: "UFA1", setName: "Uncapped Fast Bowlers Set 1", isCapped: false, stats: { matches: 2, wkts: 1, econ: 12.0, bb: "1/44" } },
  { name: "Kuldeep Sen", role: "Bowler", country: "India", basePrice: 40, set: "UFA1", setName: "Uncapped Fast Bowlers Set 1", isCapped: true, stats: { matches: 12, wkts: 14, econ: 9.87, bb: "4/20" } },
  { name: "Akash Madhwal", role: "Bowler", country: "India", basePrice: 40, set: "UFA1", setName: "Uncapped Fast Bowlers Set 1", isCapped: false, stats: { matches: 13, wkts: 19, econ: 9.38, bb: "5/5" } },

  // --- UNCAPPED SPINNERS SET 1 (USP1) ---
  { name: "Manav Suthar", role: "Bowler", country: "India", basePrice: 30, set: "USP1", setName: "Uncapped Spinners Set 1", isCapped: false, stats: { matches: 1, wkts: 0, econ: 8.67, bb: "0/26" } },
  { name: "Kumar Kartikeya", role: "Bowler", country: "India", basePrice: 30, set: "USP1", setName: "Uncapped Spinners Set 1", isCapped: false, stats: { matches: 12, wkts: 10, econ: 8.24, bb: "2/22" } },
  { name: "Shreyas Gopal", role: "Bowler", country: "India", basePrice: 30, set: "USP1", setName: "Uncapped Spinners Set 1", isCapped: false, stats: { matches: 52, wkts: 52, econ: 8.11, bb: "4/16" } },
  { name: "M Siddharth", role: "Bowler", country: "India", basePrice: 30, set: "USP1", setName: "Uncapped Spinners Set 1", isCapped: false, stats: { matches: 3, wkts: 3, econ: 7.92, bb: "1/21" } },
  { name: "Murugan Ashwin", role: "Bowler", country: "India", basePrice: 30, set: "USP1", setName: "Uncapped Spinners Set 1", isCapped: false, stats: { matches: 44, wkts: 35, econ: 7.98, bb: "3/34" } },
  { name: "Tanush Kotian", role: "Bowler", country: "India", basePrice: 30, set: "USP1", setName: "Uncapped Spinners Set 1", isCapped: false, stats: { matches: 1, wkts: 0, econ: 6.0, runs: 24 } },
  { name: "Prince Choudhary", role: "Bowler", country: "India", basePrice: 30, set: "USP1", setName: "Uncapped Spinners Set 1", isCapped: false, stats: { matches: 0, wkts: 0, econ: 7.5, bb: "Domestic" } },
  { name: "Jhathavedh Subramanyan", role: "Bowler", country: "India", basePrice: 30, set: "USP1", setName: "Uncapped Spinners Set 1", isCapped: false, stats: { matches: 0, wkts: 0, econ: 7.2, bb: "TNPL" } },
  { name: "Shiva Singh", role: "Bowler", country: "India", basePrice: 30, set: "USP1", setName: "Uncapped Spinners Set 1", isCapped: false, stats: { matches: 1, wkts: 0, econ: 8.0, bb: "0/16" } },
  { name: "Himanshu Sharma", role: "Bowler", country: "India", basePrice: 30, set: "USP1", setName: "Uncapped Spinners Set 1", isCapped: false, stats: { matches: 2, wkts: 0, econ: 10.5, bb: "0/21" } },

  // --- CAPPED BATTERS SET 2 (BA2) ---
  { name: "Karun Nair", role: "Batter", country: "India", basePrice: 50, set: "BA2", setName: "Capped Batters Set 2", isCapped: true, stats: { matches: 76, runs: 1496, sr: 127.8, hs: "83*" } },
  { name: "Finn Allen", role: "Batter", country: "New Zealand", basePrice: 200, set: "BA2", setName: "Capped Batters Set 2", isCapped: true, stats: { matches: 0, runs: 0, sr: 163.6, hs: "T20I 137" } },
  { name: "Rovman Powell", role: "Batter", country: "West Indies", basePrice: 150, set: "BA2", setName: "Capped Batters Set 2", isCapped: true, stats: { matches: 26, runs: 360, sr: 146.9, hs: "67*" } },
  { name: "Rilee Rossouw", role: "Batter", country: "South Africa", basePrice: 200, set: "BA2", setName: "Capped Batters Set 2", isCapped: true, stats: { matches: 22, runs: 473, sr: 158.2, hs: "82*" } },
  { name: "Jason Roy", role: "Batter", country: "England", basePrice: 150, set: "BA2", setName: "Capped Batters Set 2", isCapped: true, stats: { matches: 21, runs: 614, sr: 138.6, hs: "91*" } },
  { name: "Sherfane Rutherford", role: "Batter", country: "West Indies", basePrice: 150, set: "BA2", setName: "Capped Batters Set 2", isCapped: true, stats: { matches: 10, runs: 106, sr: 101.9, hs: "28" } },
  { name: "Abhimanyu Easwaran", role: "Batter", country: "India", basePrice: 30, set: "BA2", setName: "Capped Batters Set 2", isCapped: false, stats: { matches: 0, runs: 0, sr: 130.2, hs: "Ranji 200" } },
  { name: "Rassie van der Dussen", role: "Batter", country: "South Africa", basePrice: 200, set: "BA2", setName: "Capped Batters Set 2", isCapped: true, stats: { matches: 3, runs: 22, sr: 95.7, hs: "12*" } },
  { name: "Ashton Turner", role: "Batter", country: "Australia", basePrice: 100, set: "BA2", setName: "Capped Batters Set 2", isCapped: true, stats: { matches: 5, runs: 3, sr: 42.9, hs: "3*" } },
  { name: "Najibullah Zadran", role: "Batter", country: "Afghanistan", basePrice: 100, set: "BA2", setName: "Capped Batters Set 2", isCapped: true, stats: { matches: 0, runs: 0, sr: 140.5, hs: "T20I 73" } },

  // --- CAPPED ALL-ROUNDERS SET 2 (AL2) ---
  { name: "Marco Jansen", role: "All-Rounder", country: "South Africa", basePrice: 125, set: "AL2", setName: "Capped All-Rounders Set 2", isCapped: true, stats: { matches: 21, wkts: 20, econ: 9.53, runs: 62 } },
  { name: "Romario Shepherd", role: "All-Rounder", country: "West Indies", basePrice: 150, set: "AL2", setName: "Capped All-Rounders Set 2", isCapped: true, stats: { matches: 10, runs: 115, sr: 221.2, wkts: 4 } },
  { name: "Sikandar Raza", role: "All-Rounder", country: "Zimbabwe", basePrice: 100, set: "AL2", setName: "Capped All-Rounders Set 2", isCapped: true, stats: { matches: 9, runs: 182, sr: 141.1, wkts: 3 } },
  { name: "Daniel Sams", role: "All-Rounder", country: "Australia", basePrice: 100, set: "AL2", setName: "Capped All-Rounders Set 2", isCapped: true, stats: { matches: 16, runs: 44, wkts: 14, econ: 8.95 } },
  { name: "David Willey", role: "All-Rounder", country: "England", basePrice: 150, set: "AL2", setName: "Capped All-Rounders Set 2", isCapped: true, stats: { matches: 11, wkts: 6, econ: 7.56, runs: 34 } },
  { name: "Chris Woakes", role: "All-Rounder", country: "England", basePrice: 200, set: "AL2", setName: "Capped All-Rounders Set 2", isCapped: true, stats: { matches: 21, wkts: 30, econ: 8.97, bb: "3/6" } },
  { name: "Michael Bracewell", role: "All-Rounder", country: "New Zealand", basePrice: 100, set: "AL2", setName: "Capped All-Rounders Set 2", isCapped: true, stats: { matches: 5, runs: 58, wkts: 6, econ: 8.62 } },
  { name: "Dwaine Pretorius", role: "All-Rounder", country: "South Africa", basePrice: 100, set: "AL2", setName: "Capped All-Rounders Set 2", isCapped: true, stats: { matches: 7, wkts: 6, econ: 9.50, runs: 44 } },
  { name: "Kyle Mayers", role: "All-Rounder", country: "West Indies", basePrice: 150, set: "AL2", setName: "Capped All-Rounders Set 2", isCapped: true, stats: { matches: 13, runs: 379, sr: 144.1, wkts: 0 } },
  { name: "Jason Holder", role: "All-Rounder", country: "West Indies", basePrice: 150, set: "AL2", setName: "Capped All-Rounders Set 2", isCapped: true, stats: { matches: 46, runs: 259, wkts: 53, econ: 8.78 } },

  // --- CAPPED FAST BOWLERS SET 2 (FA2) ---
  { name: "Umran Malik", role: "Bowler", country: "India", basePrice: 75, set: "FA2", setName: "Capped Fast Bowlers Set 2", isCapped: true, stats: { matches: 26, wkts: 29, econ: 9.39, bb: "5/25" } },
  { name: "Chetan Sakariya", role: "Bowler", country: "India", basePrice: 50, set: "FA2", setName: "Capped Fast Bowlers Set 2", isCapped: true, stats: { matches: 19, wkts: 20, econ: 8.44, bb: "3/31" } },
  { name: "Shivam Mavi", role: "Bowler", country: "India", basePrice: 75, set: "FA2", setName: "Capped Fast Bowlers Set 2", isCapped: true, stats: { matches: 32, wkts: 30, econ: 8.71, bb: "4/21" } },
  { name: "Jhye Richardson", role: "Bowler", country: "Australia", basePrice: 150, set: "FA2", setName: "Capped Fast Bowlers Set 2", isCapped: true, stats: { matches: 4, wkts: 3, econ: 10.64, bb: "2/41" } },
  { name: "Gus Atkinson", role: "Bowler", country: "England", basePrice: 100, set: "FA2", setName: "Capped Fast Bowlers Set 2", isCapped: true, stats: { matches: 0, wkts: 0, econ: 8.5, bb: "T20I 4/20" } },
  { name: "Nuwan Thushara", role: "Bowler", country: "Sri Lanka", basePrice: 100, set: "FA2", setName: "Capped Fast Bowlers Set 2", isCapped: true, stats: { matches: 7, wkts: 8, econ: 9.88, bb: "3/42" } },
  { name: "Lungi Ngidi", role: "Bowler", country: "South Africa", basePrice: 150, set: "FA2", setName: "Capped Fast Bowlers Set 2", isCapped: true, stats: { matches: 14, wkts: 25, econ: 8.30, bb: "4/10" } },
  { name: "Matt Henry", role: "Bowler", country: "New Zealand", basePrice: 150, set: "FA2", setName: "Capped Fast Bowlers Set 2", isCapped: true, stats: { matches: 2, wkts: 1, econ: 12.0, bb: "1/40" } },
  { name: "Sean Abbott", role: "Bowler", country: "Australia", basePrice: 100, set: "FA2", setName: "Capped Fast Bowlers Set 2", isCapped: true, stats: { matches: 3, wkts: 1, econ: 11.2, bb: "1/47" } },
  { name: "Sandeep Sharma", role: "Bowler", country: "India", basePrice: 50, set: "FA2", setName: "Capped Fast Bowlers Set 2", isCapped: true, stats: { matches: 127, wkts: 137, econ: 7.86, bb: "5/18" } },

  // --- CAPPED SPINNERS SET 2 (SP2) ---
  { name: "Ish Sodhi", role: "Bowler", country: "New Zealand", basePrice: 100, set: "SP2", setName: "Capped Spinners Set 2", isCapped: true, stats: { matches: 8, wkts: 9, econ: 6.70, bb: "3/14" } },
  { name: "Keshav Maharaj", role: "Bowler", country: "South Africa", basePrice: 100, set: "SP2", setName: "Capped Spinners Set 2", isCapped: true, stats: { matches: 2, wkts: 2, econ: 6.50, bb: "2/23" } },
  { name: "Akeal Hosein", role: "Bowler", country: "West Indies", basePrice: 150, set: "SP2", setName: "Capped Spinners Set 2", isCapped: true, stats: { matches: 1, wkts: 1, econ: 6.00, bb: "1/24" } },
  { name: "Mitchell Santner", role: "Bowler", country: "New Zealand", basePrice: 150, set: "SP2", setName: "Capped Spinners Set 2", isCapped: true, stats: { matches: 18, wkts: 15, econ: 6.93, bb: "2/13" } },
  { name: "Mayank Markande", role: "Bowler", country: "India", basePrice: 50, set: "SP2", setName: "Capped Spinners Set 2", isCapped: true, stats: { matches: 37, wkts: 37, econ: 8.87, bb: "4/23" } },
  { name: "Shahbaz Ahmed", role: "All-Rounder", country: "India", basePrice: 100, set: "SP2", setName: "Capped Spinners Set 2", isCapped: true, stats: { matches: 55, runs: 531, wkts: 20, econ: 8.65 } },
  { name: "Krishnappa Gowtham", role: "All-Rounder", country: "India", basePrice: 50, set: "SP2", setName: "Capped Spinners Set 2", isCapped: true, stats: { matches: 36, runs: 247, wkts: 21, econ: 8.26 } },
  { name: "Todd Murphy", role: "Bowler", country: "Australia", basePrice: 75, set: "SP2", setName: "Capped Spinners Set 2", isCapped: true, stats: { matches: 0, wkts: 0, econ: 7.2, bb: "BBL 3/18" } },
  { name: "Vijayakanth Viyaskanth", role: "Bowler", country: "Sri Lanka", basePrice: 50, set: "SP2", setName: "Capped Spinners Set 2", isCapped: true, stats: { matches: 4, wkts: 1, econ: 8.67, bb: "1/27" } },
  { name: "Qais Ahmad", role: "Bowler", country: "Afghanistan", basePrice: 75, set: "SP2", setName: "Capped Spinners Set 2", isCapped: true, stats: { matches: 0, wkts: 0, econ: 7.6, bb: "T20" } },

  // --- UNCAPPED BATTERS SET 2 (UBA2) ---
  { name: "Musheer Khan", role: "Batter", country: "India", basePrice: 30, set: "UBA2", setName: "Uncapped Batters Set 2", isCapped: false, stats: { matches: 0, runs: 0, sr: 135.0, hs: "Ranji 181" } },
  { name: "Prakhar Chaturvedi", role: "Batter", country: "India", basePrice: 30, set: "UBA2", setName: "Uncapped Batters Set 2", isCapped: false, stats: { matches: 0, runs: 0, sr: 130.0, hs: "Cooch Behar 404*" } },
  { name: "Uday Saharan", role: "Batter", country: "India", basePrice: 30, set: "UBA2", setName: "Uncapped Batters Set 2", isCapped: false, stats: { matches: 0, runs: 0, sr: 125.0, hs: "U19 WC Capt" } },
  { name: "Suyash Prabhudessai", role: "Batter", country: "India", basePrice: 30, set: "UBA2", setName: "Uncapped Batters Set 2", isCapped: false, stats: { matches: 10, runs: 126, sr: 121.2, hs: "34" } },
  { name: "Ricky Bhui", role: "Batter", country: "India", basePrice: 30, set: "UBA2", setName: "Uncapped Batters Set 2", isCapped: false, stats: { matches: 4, runs: 8, sr: 61.5, hs: "5" } },
  { name: "Himmat Singh", role: "Batter", country: "India", basePrice: 30, set: "UBA2", setName: "Uncapped Batters Set 2", isCapped: false, stats: { matches: 0, runs: 0, sr: 138.0, hs: "Delhi" } },
  { name: "Subhranshu Senapati", role: "Batter", country: "India", basePrice: 30, set: "UBA2", setName: "Uncapped Batters Set 2", isCapped: false, stats: { matches: 0, runs: 0, sr: 128.0, hs: "Odisha" } },
  { name: "Sachin Baby", role: "Batter", country: "India", basePrice: 30, set: "UBA2", setName: "Uncapped Batters Set 2", isCapped: false, stats: { matches: 19, runs: 144, sr: 105.9, hs: "33" } },
  { name: "Rohan Kunnummal", role: "Batter", country: "India", basePrice: 30, set: "UBA2", setName: "Uncapped Batters Set 2", isCapped: false, stats: { matches: 0, runs: 0, sr: 145.0, hs: "Kerala" } },
  { name: "Sanjay Yadav", role: "All-Rounder", country: "India", basePrice: 30, set: "UBA2", setName: "Uncapped Batters Set 2", isCapped: false, stats: { matches: 1, runs: 0, wkts: 0, econ: 11.5 } },

  // --- UNCAPPED FAST BOWLERS SET 2 (UFA2) ---
  { name: "Prince Yadav", role: "Bowler", country: "India", basePrice: 30, set: "UFA2", setName: "Uncapped Fast Bowlers Set 2", isCapped: false, stats: { matches: 0, wkts: 0, econ: 8.2, bb: "Delhi" } },
  { name: "Vipraj Nigam", role: "Bowler", country: "India", basePrice: 30, set: "UFA2", setName: "Uncapped Fast Bowlers Set 2", isCapped: false, stats: { matches: 0, wkts: 0, econ: 7.9, bb: "UP" } },
  { name: "Kuldip Yadav", role: "Bowler", country: "India", basePrice: 30, set: "UFA2", setName: "Uncapped Fast Bowlers Set 2", isCapped: false, stats: { matches: 1, wkts: 1, econ: 8.0, bb: "1/32" } },
  { name: "Vidwath Kaverappa", role: "Bowler", country: "India", basePrice: 30, set: "UFA2", setName: "Uncapped Fast Bowlers Set 2", isCapped: false, stats: { matches: 2, wkts: 2, econ: 9.14, bb: "2/36" } },
  { name: "Vyshak Vijaykumar", role: "Bowler", country: "India", basePrice: 30, set: "UFA2", setName: "Uncapped Fast Bowlers Set 2", isCapped: false, stats: { matches: 11, wkts: 13, econ: 10.15, bb: "3/23" } },
  { name: "Gurnoor Brar", role: "Bowler", country: "India", basePrice: 30, set: "UFA2", setName: "Uncapped Fast Bowlers Set 2", isCapped: false, stats: { matches: 1, wkts: 0, econ: 14.0, bb: "0/42" } },
  { name: "KM Asif", role: "Bowler", country: "India", basePrice: 30, set: "UFA2", setName: "Uncapped Fast Bowlers Set 2", isCapped: false, stats: { matches: 7, wkts: 7, econ: 9.35, bb: "2/25" } },
  { name: "Pradeep Sangwan", role: "Bowler", country: "India", basePrice: 30, set: "UFA2", setName: "Uncapped Fast Bowlers Set 2", isCapped: true, stats: { matches: 39, wkts: 35, econ: 8.79, bb: "3/18" } },
  { name: "Varun Aaron", role: "Bowler", country: "India", basePrice: 50, set: "UFA2", setName: "Uncapped Fast Bowlers Set 2", isCapped: true, stats: { matches: 52, wkts: 44, econ: 8.94, bb: "3/16" } },
  { name: "Basil Thampi", role: "Bowler", country: "India", basePrice: 30, set: "UFA2", setName: "Uncapped Fast Bowlers Set 2", isCapped: true, stats: { matches: 25, wkts: 22, econ: 9.98, bb: "3/35" } }
];

// Left hand batters
const LEFT_HAND_BATTERS = new Set([
  "Rishabh Pant", "Arshdeep Singh", "Mitchell Starc", "David Miller", "Devon Conway",
  "Quinton de Kock", "Devdutt Padikkal", "David Warner", "Sam Curran", "Venkatesh Iyer",
  "Washington Sundar", "Krunal Pandya", "Nitish Rana", "Rachin Ravindra", "Moeen Ali",
  "Ishan Kishan", "Anuj Rawat", "Ryan Rickelton", "Alex Carey", "Khaleel Ahmed",
  "Spencer Johnson", "Karn Sharma", "Piyush Chawla", "Nehal Wadhera", "Priyansh Arya",
  "Nishant Sindhu", "Harpreet Brar", "Raj Bawa", "Mahipal Lomror", "Vivrant Sharma",
  "Robin Minz", "Luvnith Sisodia", "Yash Dayal", "Sushant Mishra", "Manav Suthar",
  "M Siddharth", "Shiva Singh", "Rilee Rossouw", "Sherfane Rutherford", "Najibullah Zadran",
  "David Willey", "Michael Bracewell", "Kyle Mayers", "Chetan Sakariya", "Akeal Hosein",
  "Mitchell Santner", "Shahbaz Ahmed", "Sachin Baby", "Sanjay Yadav", "Kuldip Yadav",
  "Pradeep Sangwan"
]);

// Pace all-rounders
const PACE_ALL_ROUNDERS = new Set([
  "Marcus Stoinis", "Sam Curran", "Venkatesh Iyer", "Shardul Thakur", "Deepak Chahar",
  "Mitchell Marsh", "Daryl Mitchell", "Shashank Singh", "Ramandeep Singh", "Arshin Kulkarni",
  "Raj Bawa", "Sanvir Singh", "Marco Jansen", "Romario Shepherd", "Daniel Sams",
  "David Willey", "Chris Woakes", "Dwaine Pretorius", "Kyle Mayers", "Jason Holder"
]);

// Spin all-rounders
const SPIN_ALL_ROUNDERS = new Set([
  "Liam Livingstone", "Glenn Maxwell", "Ravichandran Ashwin", "Washington Sundar",
  "Wanindu Hasaranga", "Krunal Pandya", "Nitish Rana", "Rachin Ravindra", "Moeen Ali",
  "Shahrukh Khan", "Naman Dhir", "Nishant Sindhu", "Harpreet Brar", "Swapnil Singh",
  "Mahipal Lomror", "Vivrant Sharma", "Sikandar Raza", "Michael Bracewell", "Shahbaz Ahmed",
  "Krishnappa Gowtham", "Sanjay Yadav"
]);

// Accurate bowling styles for bowlers and allrounders
const BOWLING_STYLES = {
  // Marquee
  "Arshdeep Singh": "Left-arm Fast-Medium (Swing)",
  "Mitchell Starc": "Left-arm Express Fast (145+ km/h)",
  "Kagiso Rabada": "Right-arm Express Fast (145+ km/h)",
  "Yuzvendra Chahal": "Right-arm Legbreak Googly",
  "Mohammed Shami": "Right-arm Fast Seam & Swing",
  "Liam Livingstone": "Right-arm Legbreak & Offbreak",
  "Glenn Maxwell": "Right-arm Offbreak",
  "Mohammed Siraj": "Right-arm Fast Swing",
  "Ravichandran Ashwin": "Right-arm Offbreak & Carrom Ball",
  "Trent Boult": "Left-arm Fast Swing",
  "Bhuvneshwar Kumar": "Right-arm Medium-Fast Swing",
  "Marcus Stoinis": "Right-arm Fast-Medium",

  // Capped All-rounders 1
  "Sam Curran": "Left-arm Fast-Medium",
  "Venkatesh Iyer": "Right-arm Medium-Fast",
  "Washington Sundar": "Right-arm Offbreak",
  "Wanindu Hasaranga": "Right-arm Legbreak Googly",
  "Krunal Pandya": "Slow Left-arm Orthodox",
  "Shardul Thakur": "Right-arm Fast-Medium (Knuckleball)",
  "Deepak Chahar": "Right-arm Medium-Fast Swing",
  "Nitish Rana": "Right-arm Offbreak",
  "Mitchell Marsh": "Right-arm Fast-Medium",
  "Rachin Ravindra": "Slow Left-arm Orthodox",
  "Daryl Mitchell": "Right-arm Medium",
  "Moeen Ali": "Right-arm Offbreak",

  // Capped Fast Bowlers 1
  "Khaleel Ahmed": "Left-arm Fast-Medium",
  "Avesh Khan": "Right-arm Fast",
  "Prasidh Krishna": "Right-arm Fast Hit-the-Deck",
  "T Natarajan": "Left-arm Fast-Medium (Yorkers)",
  "Josh Hazlewood": "Right-arm Fast Seam",
  "Anrich Nortje": "Right-arm Express Fast (150+ km/h)",
  "Gerald Coetzee": "Right-arm Express Fast (145+ km/h)",
  "Lockie Ferguson": "Right-arm Express Fast (150+ km/h)",
  "Alzarri Joseph": "Right-arm Fast Bouncer",
  "Naveen-ul-Haq": "Right-arm Fast-Medium Variations",
  "Spencer Johnson": "Left-arm Express Fast (145+ km/h)",
  "Mukesh Kumar": "Right-arm Fast-Medium Seam",

  // Capped Spinners 1
  "Noor Ahmad": "Left-arm Wrist Spin (Chinaman)",
  "Maheesh Theekshana": "Right-arm Mystery Spin & Carrom Ball",
  "Rahul Chahar": "Right-arm Legbreak Googly",
  "Adam Zampa": "Right-arm Legbreak Googly",
  "Suyash Sharma": "Right-arm Legbreak Googly",
  "Karn Sharma": "Right-arm Legbreak Googly",
  "Mujeeb Ur Rahman": "Right-arm Offbreak & Carrom Ball",
  "Piyush Chawla": "Right-arm Legbreak Googly",
  "Tabraiz Shamsi": "Left-arm Wrist Spin (Chinaman)",
  "Adil Rashid": "Right-arm Legbreak Googly",

  // Uncapped All-rounders 1
  "Shashank Singh": "Right-arm Medium",
  "Ramandeep Singh": "Right-arm Medium-Fast",
  "Shahrukh Khan": "Right-arm Offbreak",
  "Naman Dhir": "Right-arm Offbreak",
  "Arshin Kulkarni": "Right-arm Medium-Fast",
  "Nishant Sindhu": "Slow Left-arm Orthodox",
  "Harpreet Brar": "Slow Left-arm Orthodox",
  "Swapnil Singh": "Slow Left-arm Orthodox",
  "Raj Bawa": "Right-arm Fast-Medium",
  "Mahipal Lomror": "Slow Left-arm Orthodox",
  "Sanvir Singh": "Right-arm Medium-Fast",
  "Vivrant Sharma": "Right-arm Legbreak",

  // Uncapped Fast Bowlers 1
  "Mayank Yadav": "Right-arm Express Fast (155+ km/h)",
  "Rasikh Salam": "Right-arm Medium-Fast",
  "Harshit Rana": "Right-arm Fast (Slower Balls)",
  "Mohit Sharma": "Right-arm Fast-Medium (Knuckleball)",
  "Kartik Tyagi": "Right-arm Fast",
  "Vaibhav Arora": "Right-arm Fast-Medium (Inswing)",
  "Simarjeet Singh": "Right-arm Fast-Medium",
  "Yash Dayal": "Left-arm Fast-Medium Swing",
  "Vijaykumar Vyshak": "Right-arm Fast-Medium Knuckleball",
  "Sushant Mishra": "Left-arm Fast-Medium",
  "Kuldeep Sen": "Right-arm Express Fast (145+ km/h)",
  "Akash Madhwal": "Right-arm Fast (Sling Action)",

  // Uncapped Spinners 1
  "Manav Suthar": "Slow Left-arm Orthodox Spin",
  "Kumar Kartikeya": "Slow Left-arm Orthodox Spin",
  "Shreyas Gopal": "Right-arm Legbreak Googly",
  "M Siddharth": "Slow Left-arm Orthodox Spin",
  "Murugan Ashwin": "Right-arm Legbreak Googly",
  "Tanush Kotian": "Right-arm Offbreak",
  "Prince Choudhary": "Right-arm Legbreak",
  "Jhathavedh Subramanyan": "Right-arm Legbreak",
  "Shiva Singh": "Slow Left-arm Orthodox Spin",
  "Himanshu Sharma": "Right-arm Legbreak Googly",

  // Capped All-rounders 2
  "Marco Jansen": "Left-arm Fast-Medium",
  "Romario Shepherd": "Right-arm Fast-Medium",
  "Sikandar Raza": "Right-arm Offbreak",
  "Daniel Sams": "Left-arm Fast-Medium",
  "David Willey": "Left-arm Fast-Medium Swing",
  "Chris Woakes": "Right-arm Fast-Medium Seam",
  "Michael Bracewell": "Right-arm Offbreak",
  "Dwaine Pretorius": "Right-arm Medium-Fast",
  "Kyle Mayers": "Right-arm Medium",
  "Jason Holder": "Right-arm Fast-Medium Bounce",

  // Capped Fast Bowlers 2
  "Umran Malik": "Right-arm Express Fast (150+ km/h)",
  "Chetan Sakariya": "Left-arm Fast-Medium",
  "Shivam Mavi": "Right-arm Fast-Medium",
  "Jhye Richardson": "Right-arm Fast Outswing",
  "Gus Atkinson": "Right-arm Fast (145+ km/h)",
  "Nuwan Thushara": "Right-arm Fast Sling-Action (Malinga Action)",
  "Lungi Ngidi": "Right-arm Fast Bounce",
  "Matt Henry": "Right-arm Fast-Medium Seam",
  "Sean Abbott": "Right-arm Fast-Medium",
  "Sandeep Sharma": "Right-arm Medium Swing & Knuckle",

  // Capped Spinners 2
  "Ish Sodhi": "Right-arm Legbreak Googly",
  "Keshav Maharaj": "Slow Left-arm Orthodox Spin",
  "Akeal Hosein": "Slow Left-arm Orthodox Spin",
  "Mitchell Santner": "Slow Left-arm Orthodox Spin",
  "Mayank Markande": "Right-arm Legbreak Googly",
  "Shahbaz Ahmed": "Slow Left-arm Orthodox Spin",
  "Krishnappa Gowtham": "Right-arm Offbreak",
  "Todd Murphy": "Right-arm Offbreak",
  "Vijayakanth Viyaskanth": "Right-arm Legbreak Googly",
  "Qais Ahmad": "Right-arm Legbreak Googly",

  // Uncapped Fast Bowlers 2
  "Prince Yadav": "Right-arm Fast-Medium",
  "Vipraj Nigam": "Right-arm Fast-Medium",
  "Kuldip Yadav": "Left-arm Fast-Medium",
  "Vidwath Kaverappa": "Right-arm Fast-Medium Outswing",
  "Vyshak Vijaykumar": "Right-arm Fast-Medium",
  "Gurnoor Brar": "Right-arm Fast-Medium",
  "KM Asif": "Right-arm Fast",
  "Pradeep Sangwan": "Left-arm Fast-Medium",
  "Varun Aaron": "Right-arm Express Fast (145+ km/h)",
  "Basil Thampi": "Right-arm Fast Yorkers",

  // Uncapped Batters 2 All-rounders
  "Sanjay Yadav": "Slow Left-arm Orthodox Spin"
};

function getPlayerCategory(p) {
  if (p.role === "WK-Batter" || p.set?.startsWith("WK") || p.set?.startsWith("UWK")) {
    return "wicketkeeper";
  }
  if (p.role === "All-Rounder" || p.set?.startsWith("AL") || p.set?.startsWith("UAL") || PACE_ALL_ROUNDERS.has(p.name) || SPIN_ALL_ROUNDERS.has(p.name)) {
    return "allrounder";
  }
  if (p.set?.startsWith("FA") || p.set?.startsWith("UFA")) {
    return "pacer";
  }
  if (p.set?.startsWith("SP") || p.set?.startsWith("USP")) {
    return "spinner";
  }
  if (p.role === "Batter" || p.set?.startsWith("BA") || p.set?.startsWith("UBA")) {
    return "batter";
  }
  if (["Arshdeep Singh", "Mitchell Starc", "Kagiso Rabada", "Mohammed Shami", "Mohammed Siraj", "Trent Boult", "Bhuvneshwar Kumar"].includes(p.name)) {
    return "pacer";
  }
  if (["Yuzvendra Chahal"].includes(p.name)) {
    return "spinner";
  }
  return "batter";
}

const processed = rawPlayers.map((p, idx) => {
  const category = getPlayerCategory(p);
  const isLHB = LEFT_HAND_BATTERS.has(p.name);
  const battingStyle = isLHB ? "Left-hand Bat" : "Right-hand Bat";
  const batShort = isLHB ? "LHB" : "RHB";

  let bowlingStyle = BOWLING_STYLES[p.name] || null;
  let bowlingType = null;
  let allrounderType = null;
  let specialization = "";

  if (category === "allrounder") {
    if (PACE_ALL_ROUNDERS.has(p.name)) {
      allrounderType = "Pace All-Rounder";
      bowlingType = "Pace";
      if (!bowlingStyle) bowlingStyle = "Right-arm Medium-Fast";
      specialization = `Pace All-Rounder (${bowlingStyle} & ${batShort})`;
    } else {
      allrounderType = "Spin All-Rounder";
      bowlingType = "Spin";
      if (!bowlingStyle) bowlingStyle = "Right-arm Offbreak";
      specialization = `Spin All-Rounder (${bowlingStyle} & ${batShort})`;
    }
  } else if (category === "pacer") {
    bowlingType = "Pace";
    if (!bowlingStyle) {
      bowlingStyle = isLHB ? "Left-arm Fast-Medium" : "Right-arm Fast-Medium";
    }
    specialization = `Fast Bowler (${bowlingStyle} & ${batShort})`;
  } else if (category === "spinner") {
    bowlingType = "Spin";
    if (!bowlingStyle) {
      bowlingStyle = "Right-arm Legbreak Googly";
    }
    specialization = `Spin Bowler (${bowlingStyle} & ${batShort})`;
  } else if (category === "wicketkeeper") {
    specialization = `Wicket-Keeper Batter (${battingStyle})`;
  } else {
    // Batter
    specialization = `${battingStyle} Specialist`;
  }

  return {
    id: `p-${idx + 1}`,
    name: p.name,
    role: p.role,
    category, // 'batter' | 'wicketkeeper' | 'allrounder' | 'pacer' | 'spinner'
    battingStyle,
    bowlingStyle,
    bowlingType,
    allrounderType,
    specialization,
    country: p.country,
    isOverseas: p.country !== "India",
    isCapped: p.isCapped,
    basePrice: p.basePrice,
    set: p.set,
    setName: p.setName,
    stats: p.stats
  };
});

const outPath = path.resolve(__dirname, '../data/players.json');
fs.writeFileSync(outPath, JSON.stringify(processed, null, 2), 'utf8');
console.log(`Generated ${processed.length} players with rich cricket metadata in ${outPath}`);
