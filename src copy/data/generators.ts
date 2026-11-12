/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChallengeItem, DifficultyLevel } from '../types';

/**
 * 配列をランダムにシャッフルするヘルパー関数（Fisher-Yates法）
 */
export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 数値に対するダミー4択と正解インデックスを生成するヘルパー
 */
function buildNumericOptions(
  correctValue: number,
  offsets: number[],
  unit = ''
): { options: string[]; correctIndex: number } {
  const distractors = new Set<number>();
  let safety = 0;
  while (distractors.size < 3 && safety < 50) {
    safety++;
    const offset = offsets[Math.floor(Math.random() * offsets.length)];
    const candidate = correctValue + offset;
    if (candidate !== correctValue && candidate > 0) {
      distractors.add(candidate);
    }
  }
  // 万が一足りない場合のフォールバック
  let fallback = 1;
  while (distractors.size < 3) {
    if (correctValue + fallback > 0) distractors.add(correctValue + fallback);
    fallback++;
  }

  const shuffledNums = shuffleArray([correctValue, ...Array.from(distractors)]);
  const correctIndex = shuffledNums.indexOf(correctValue);
  return {
    options: shuffledNums.map((n) => `${n}${unit}`),
    correctIndex,
  };
}

/**
 * 1. 計算問題（math）のプログラム自動生成（4択タップ or 数字テンキー手入力）
 */
export function generateMathChallenge(difficulty: DifficultyLevel): ChallengeItem {
  const inputMode: 'choice' | 'numpad' = Math.random() < 0.5 ? 'choice' : 'numpad';
  let questionText = '';
  let correctAnswer = 0;

  if (difficulty === 'easy') {
    const isAdd = Math.random() < 0.6;
    if (isAdd) {
      const a = Math.floor(Math.random() * 35) + 12;
      const b = Math.floor(Math.random() * 25) + 9;
      correctAnswer = a + b;
      questionText = `${a} + ${b} = ?`;
    } else {
      const a = Math.floor(Math.random() * 40) + 35;
      const b = Math.floor(Math.random() * 24) + 11;
      correctAnswer = a - b;
      questionText = `${a} - ${b} = ?`;
    }
  } else if (difficulty === 'normal') {
    const a = Math.floor(Math.random() * 14) + 12;
    const b = Math.floor(Math.random() * 7) + 4;
    const c = Math.floor(Math.random() * 19) + 7;
    if (Math.random() < 0.5) {
      correctAnswer = a * b - c;
      questionText = `${a} × ${b} - ${c} = ?`;
    } else {
      correctAnswer = a * b + c;
      questionText = `${a} × ${b} + ${c} = ?`;
    }
  } else {
    const a = Math.floor(Math.random() * 18) + 16;
    const b = Math.floor(Math.random() * 8) + 11;
    const c = Math.floor(Math.random() * 45) + 15;
    correctAnswer = a * b + c;
    questionText = `${a} × ${b} + ${c} = ?`;
  }

  const levelText =
    difficulty === 'easy' ? 'かんたん' : difficulty === 'normal' ? '中級' : '上級';
  const subPrompt =
    inputMode === 'numpad'
      ? `【計算・${levelText}】答えを数字キーで直接入力してください`
      : `【計算・${levelText}】正しい計算結果を選んでください`;

  const { options, correctIndex } = buildNumericOptions(correctAnswer, [
    -10, -2, -1, 1, 2, 10, 12, -8, 20, -20,
  ]);

  return {
    id: `math-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: 'math',
    difficulty,
    inputMode,
    question: questionText,
    subPrompt,
    options,
    correctIndex,
    correctAnswerText: String(correctAnswer),
    explanation: `正解は ${correctAnswer} です。`,
  };
}

/**
 * 2. 瞬間記憶（memory）のプログラム自動生成
 */
export function generateMemoryChallenge(difficulty: DifficultyLevel): ChallengeItem {
  const digitCount = difficulty === 'easy' ? 4 : difficulty === 'normal' ? 5 : 6;
  const flashDurationMs = difficulty === 'easy' ? 2400 : difficulty === 'normal' ? 2100 : 1900;
  const inputMode: 'choice' | 'numpad' = Math.random() < 0.5 ? 'choice' : 'numpad';

  let digits = '';
  for (let i = 0; i < digitCount; i++) {
    digits += String(Math.floor(Math.random() * 9) + 1);
  }

  const distractors = new Set<string>();
  while (distractors.size < 3) {
    const arr = digits.split('');
    const idxToChange = Math.floor(Math.random() * arr.length);
    const newDigit = String(
      ((Number(arr[idxToChange]) + Math.floor(Math.random() * 7) + 1) % 9) + 1
    );
    arr[idxToChange] = newDigit;
    const candidate = arr.join('');
    if (candidate !== digits) {
      distractors.add(candidate);
    }
  }

  const shuffledOptions = shuffleArray([digits, ...Array.from(distractors)]);
  const correctIndex = shuffledOptions.indexOf(digits);
  const levelText =
    difficulty === 'easy' ? 'かんたん' : difficulty === 'normal' ? '中級' : '上級';

  return {
    id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: 'memory',
    difficulty,
    inputMode,
    question: '今表示された数字の並びは？',
    subPrompt: `【瞬間記憶・${levelText}】一瞬表示される${digitCount}桁の数字を記憶してください`,
    flashText: digits,
    flashDurationMs,
    options: shuffledOptions,
    correctIndex,
    correctAnswerText: digits,
    explanation: `表示されていた数字は「${digits}」でした。`,
  };
}

/**
 * 3. ストループ判定（stroop）のプログラム自動生成
 */
export function generateStroopChallenge(difficulty: DifficultyLevel): ChallengeItem {
  const fullPalette = [
    { name: 'あか（赤）', word: 'あか', hex: '#DC2626' },
    { name: 'あお（青）', word: 'あお', hex: '#2563EB' },
    { name: 'きいろ（黄）', word: 'きいろ', hex: '#D97706' },
    { name: 'みどり（緑）', word: 'みどり', hex: '#059669' },
    { name: 'むらさき（紫）', word: 'むらさき', hex: '#9333EA' },
    { name: 'オレンジ（橙）', word: 'オレンジ', hex: '#EA580C' },
  ];

  // ランダムに4色を抽出
  const picked4 = shuffleArray(fullPalette).slice(0, 4);
  const wordIdx = Math.floor(Math.random() * 4);
  let colorIdx = Math.floor(Math.random() * 4);
  while (colorIdx === wordIdx) {
    colorIdx = Math.floor(Math.random() * 4);
  }

  const askColor = difficulty === 'easy' ? true : Math.random() < 0.6;
  const correctIndex = askColor ? colorIdx : wordIdx;

  const questionPrompt = askColor
    ? '文字の意味ではなく、【塗られている色】を選んでください'
    : '塗られている色ではなく、【書かれている文字の意味】を選んでください';

  return {
    id: `stroop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: 'stroop',
    difficulty,
    inputMode: 'choice',
    question: questionPrompt,
    subPrompt: '【色・文字判定】ひっかけに注意して答えてください',
    stroopDisplay: {
      word: picked4[wordIdx].word,
      colorHex: picked4[colorIdx].hex,
    },
    options: picked4.map((p) => p.name),
    correctIndex,
    correctAnswerText: picked4[correctIndex].name,
    explanation: askColor
      ? `文字は「${picked4[wordIdx].word}」ですが、塗られている色は「${picked4[colorIdx].name}」でした。`
      : `塗られている色は「${picked4[colorIdx].name}」ですが、書かれている文字は「${picked4[wordIdx].name}」でした。`,
  };
}

/**
 * 4. 時計・角度・図形パズル（spatial）のプログラム自動生成
 * 毎回ランダムな時刻のミラー時計・針の角度・多角形の内角を計算式で自動生成！
 */
export function generateSpatialChallenge(difficulty: DifficultyLevel): ChallengeItem {
  const pattern = Math.floor(Math.random() * 3); // 0: ミラー時計, 1: 三角形・四角形角度, 2: 時計の針の角度またはサイコロ

  if (pattern === 0) {
    // ミラー時計（鏡に映った時計の時刻から実際の時刻を算出）
    if (difficulty === 'easy') {
      const mirrorHour = Math.floor(Math.random() * 11) + 1; // 1〜11時ちょうど
      const realHour = 12 - mirrorHour;
      const correctStr = `${realHour}時00分`;
      const wrongHours = new Set<number>();
      while (wrongHours.size < 3) {
        const h = Math.floor(Math.random() * 11) + 1;
        if (h !== realHour) wrongHours.add(h);
      }
      const opts = shuffleArray([
        correctStr,
        ...Array.from(wrongHours).map((h) => `${h}時00分`),
      ]);
      return {
        id: `spatial-mirror-${Date.now()}`,
        category: 'spatial',
        difficulty,
        inputMode: 'choice',
        question: `アナログ時計を鏡に映したら「${mirrorHour}時00分」に見えました。実際の正しい時刻は？`,
        subPrompt: '【ミラー時計・かんたん】左右反転した時計をイメージしてください',
        options: opts,
        correctIndex: opts.indexOf(correctStr),
        correctAnswerText: correctStr,
        explanation: `ちょうどの時刻は「12時 − 見えている時刻」で求まります（12 - ${mirrorHour} = ${realHour}時00分）。`,
      };
    } else {
      // 分単位があるミラー時計（11時60分から引く）
      const mirrorHour = Math.floor(Math.random() * 10) + 1; // 1〜10
      const minsList = difficulty === 'normal' ? [15, 30, 45] : [10, 20, 25, 35, 40, 50];
      const mirrorMin = minsList[Math.floor(Math.random() * minsList.length)];
      const realHour = 11 - mirrorHour;
      const realMin = 60 - mirrorMin;
      const pad = (n: number) => String(n).padStart(2, '0');
      const correctStr = `${realHour}時${pad(realMin)}分`;

      // ひっかけ選択肢（12時から引いてしまったミスや分をそのままにしたミス）
      const distractors = new Set<string>([
        `${12 - mirrorHour}時${pad(realMin)}分`,
        `${realHour}時${pad(mirrorMin)}分`,
        `${12 - mirrorHour}時${pad(mirrorMin)}分`,
      ]);
      distractors.delete(correctStr);
      while (distractors.size < 3) {
        distractors.add(`${((realHour + distractors.size) % 11) + 1}時${pad(realMin)}分`);
      }

      const opts = shuffleArray([correctStr, ...Array.from(distractors).slice(0, 3)]);
      return {
        id: `spatial-mirror-${Date.now()}`,
        category: 'spatial',
        difficulty,
        inputMode: 'choice',
        question: `アナログ時計を鏡に映したら「${mirrorHour}時${pad(mirrorMin)}分」に見えました。実際の正しい時刻は？`,
        subPrompt: '【ミラー時計】「11時60分」から引くと正確に求まります',
        options: opts,
        correctIndex: opts.indexOf(correctStr),
        correctAnswerText: correctStr,
        explanation: `11時60分 − ${mirrorHour}時${pad(mirrorMin)}分 ＝「${correctStr}」が実際の時刻です。`,
      };
    }
  } else if (pattern === 1) {
    // 図形の内角計算
    if (difficulty === 'easy' || difficulty === 'normal') {
      const angleA = (Math.floor(Math.random() * 7) + 4) * 10 + (difficulty === 'normal' ? 5 : 0);
      const angleB = (Math.floor(Math.random() * 6) + 3) * 10 + (difficulty === 'normal' ? 5 : 0);
      const remain = 180 - (angleA + angleB);
      const { options, correctIndex } = buildNumericOptions(
        remain,
        [-20, -10, -5, 5, 10, 15, 20],
        '°'
      );
      return {
        id: `spatial-angle-${Date.now()}`,
        category: 'spatial',
        difficulty,
        inputMode: 'choice',
        question: `三角形の3つの内角のうち、2つが「${angleA}°」と「${angleB}°」のとき、残りの1つの角は何度？`,
        subPrompt: '【図形パズル】三角形の内角の和は180°です',
        options,
        correctIndex,
        correctAnswerText: `${remain}°`,
        explanation: `180° - (${angleA}° + ${angleB}°) = ${remain}° です。`,
      };
    } else {
      // 四角形の内角（和は360°）
      const a1 = (Math.floor(Math.random() * 5) + 6) * 10 + 5; // 65..105
      const a2 = (Math.floor(Math.random() * 5) + 7) * 10;     // 70..110
      const a3 = (Math.floor(Math.random() * 4) + 8) * 10 + 5; // 85..115
      const remain = 360 - (a1 + a2 + a3);
      const { options, correctIndex } = buildNumericOptions(
        remain,
        [-20, -10, -5, 5, 10, 15, 20],
        '°'
      );
      return {
        id: `spatial-quad-${Date.now()}`,
        category: 'spatial',
        difficulty,
        inputMode: 'choice',
        question: `四角形の4つの内角のうち、3つが「${a1}°」「${a2}°」「${a3}°」のとき、残りの1つの角は何度？`,
        subPrompt: '【図形パズル・上級】四角形の内角の和は360°です',
        options,
        correctIndex,
        correctAnswerText: `${remain}°`,
        explanation: `360° - (${a1}° + ${a2}° + ${a3}°) = ${remain}° です。`,
      };
    }
  } else {
    // サイコロの反対面パズル / 時計の針の角度
    if (difficulty !== 'hard') {
      const topFace = Math.floor(Math.random() * 6) + 1;
      const bottomFace = 7 - topFace;
      const secondTop = ((topFace + Math.floor(Math.random() * 4) + 1) % 6) + 1;
      const secondBottom = 7 - secondTop;
      const totalSum = bottomFace + secondBottom;
      const { options, correctIndex } = buildNumericOptions(totalSum, [-3, -2, -1, 1, 2, 3]);

      return {
        id: `spatial-dice-${Date.now()}`,
        category: 'spatial',
        difficulty,
        inputMode: 'choice',
        question: `2つのサイコロを並べ、上の面がそれぞれ「${topFace}」と「${secondTop}」のとき、机に接している【底面2つの数字の合計】はいくつ？`,
        subPrompt: '【空間図形】サイコロの向かい合う面の和は常に「7」です',
        options,
        correctIndex,
        correctAnswerText: String(totalSum),
        explanation: `それぞれの底面は (7-${topFace}=${bottomFace}) と (7-${secondTop}=${secondBottom}) なので、合計は ${totalSum} です。`,
      };
    } else {
      // 時計の「〇時30分」の長針と短針の間の角度
      const hour = [1, 2, 3, 4, 7, 8, 9, 10][Math.floor(Math.random() * 8)];
      const minuteAngle = 180; // 30分＝180°
      const hourAngle = hour * 30 + 15; // 30分で短針も15°進む
      const diff = Math.abs(minuteAngle - hourAngle);
      const { options, correctIndex } = buildNumericOptions(
        diff,
        [-30, -15, 15, 30, 45],
        '°'
      );

      return {
        id: `spatial-clock-angle-${Date.now()}`,
        category: 'spatial',
        difficulty,
        inputMode: 'choice',
        question: `アナログ時計が「${hour}時30分」を指しているとき、長針と短針の間の角度は何度？`,
        subPrompt: '【時計角度・上級】30分のとき短針も半分（15°）進んでいます',
        options,
        correctIndex,
        correctAnswerText: `${diff}°`,
        explanation: `長針は180°、短針は ${hour}×30° + 15° = ${hourAngle}° の位置にあるため、差は ${diff}° です。`,
      };
    }
  }
}

/**
 * 5. 論理パズル（logic）のプログラム自動生成
 * 数列規則性・順序推論・真偽パズルを毎回違う数値や人物並びで自動生成！
 */
export function generateLogicChallenge(difficulty: DifficultyLevel): ChallengeItem {
  const pattern = Math.floor(Math.random() * 3); // 0: 数列推論, 1: 順序・比較推論, 2: 年齢・倍数・論理計算

  if (pattern === 0) {
    // ランダム数列生成
    if (difficulty === 'easy') {
      const start = Math.floor(Math.random() * 12) + 2;
      const step = Math.floor(Math.random() * 7) + 3;
      const seq = [0, 1, 2, 3, 4].map((i) => start + i * step);
      const answer = start + 5 * step;
      const { options, correctIndex } = buildNumericOptions(answer, [
        -step,
        -2,
        -1,
        1,
        2,
        step,
      ]);
      return {
        id: `logic-seq-${Date.now()}`,
        category: 'logic',
        difficulty,
        inputMode: 'choice',
        question: `${seq.join(', ')}, [ ? ]`,
        subPrompt: '【論理数列・かんたん】規則性を見抜いて [ ? ] に入る数字を選んでください',
        options,
        correctIndex,
        correctAnswerText: String(answer),
        explanation: `毎回 +${step} ずつ増える等差数列です。${seq[4]} + ${step} = ${answer} となります。`,
      };
    } else if (difficulty === 'normal') {
      // 階差数列（差が +2, +4, +6, +8... または +3, +5, +7, +9...）
      const start = Math.floor(Math.random() * 8) + 2;
      const baseDiff = Math.floor(Math.random() * 3) + 2;
      const stepInc = Math.floor(Math.random() * 2) + 2;
      const seq = [start];
      for (let i = 0; i < 4; i++) {
        seq.push(seq[i] + baseDiff + i * stepInc);
      }
      const nextDiff = baseDiff + 4 * stepInc;
      const answer = seq[4] + nextDiff;
      const { options, correctIndex } = buildNumericOptions(answer, [
        -stepInc,
        -2,
        -1,
        1,
        2,
        stepInc,
        4,
      ]);
      return {
        id: `logic-seq-diff-${Date.now()}`,
        category: 'logic',
        difficulty,
        inputMode: 'choice',
        question: `${seq.join(', ')}, [ ? ]`,
        subPrompt: '【論理数列・中級】隣り合う数字の「差の変化」に注目してください',
        options,
        correctIndex,
        correctAnswerText: String(answer),
        explanation: `増え方が毎回 +${stepInc} ずつ大きくなっています。次は +${nextDiff} なので ${seq[4]} + ${nextDiff} = ${answer} です。`,
      };
    } else {
      // 2倍＋定数 または フィボナッチ型（前の2つの和）
      if (Math.random() < 0.5) {
        const a0 = Math.floor(Math.random() * 4) + 2;
        const a1 = Math.floor(Math.random() * 5) + 3;
        const seq = [a0, a1];
        for (let i = 2; i < 6; i++) {
          seq.push(seq[i - 2] + seq[i - 1]);
        }
        const answer = seq[4] + seq[5];
        const { options, correctIndex } = buildNumericOptions(answer, [
          -5, -3, -2, -1, 1, 2, 4, 6,
        ]);
        return {
          id: `logic-fib-${Date.now()}`,
          category: 'logic',
          difficulty,
          inputMode: 'choice',
          question: `${seq.join(', ')}, [ ? ]`,
          subPrompt: '【論理数列・上級】前の2つの数字の関係に注目してください',
          options,
          correctIndex,
          correctAnswerText: String(answer),
          explanation: `「前の2つの数を足すと次の数になる」フィボナッチ型の数列です。${seq[4]} + ${seq[5]} = ${answer} です。`,
        };
      } else {
        const start = Math.floor(Math.random() * 4) + 2;
        const add = Math.floor(Math.random() * 3) + 1;
        const seq = [start];
        for (let i = 0; i < 4; i++) {
          seq.push(seq[i] * 2 + add);
        }
        const answer = seq[4] * 2 + add;
        const { options, correctIndex } = buildNumericOptions(answer, [
          -4, -2, -1, 1, 2, 4, 8,
        ]);
        return {
          id: `logic-double-${Date.now()}`,
          category: 'logic',
          difficulty,
          inputMode: 'choice',
          question: `${seq.join(', ')}, [ ? ]`,
          subPrompt: '【論理数列・上級】「2倍して何かを足す」規則を見抜いてください',
          options,
          correctIndex,
          correctAnswerText: String(answer),
          explanation: `前の数を「2倍して +${add}」する規則です。${seq[4]} × 2 + ${add} = ${answer} です。`,
        };
      }
    }
  } else if (pattern === 1) {
    // 4人の順序推論パズル（毎回順位と質問対象がランダムに変わる）
    const names = ['Aさん', 'Bさん', 'Cさん', 'Dさん'];
    const order = shuffleArray(names); // order[0]が1位（最も速い/高い）、order[3]が4位

    const askIndex =
      difficulty === 'easy'
        ? 3 // 一番遅い人
        : difficulty === 'normal'
        ? 1 // 2番目の人
        : 2; // 3番目の人

    const askLabel =
      askIndex === 3
        ? '一番遅く到着したのは誰？'
        : askIndex === 1
        ? '【2番目】に到着したのは誰？'
        : '【3番目】に到着したのは誰？';

    const clue1 = `${order[0]}は${order[1]}より先に着いた。`;
    const clue2 = `${order[2]}は${order[1]}より後に着いたが、${order[3]}よりは先に着いた。`;
    const clauses = shuffleArray([clue1, clue2]);

    const correctPerson = order[askIndex];
    const correctIndex = names.indexOf(correctPerson);

    return {
      id: `logic-order-${Date.now()}`,
      category: 'logic',
      difficulty,
      inputMode: 'choice',
      question: `「${clauses.join('')}」このとき、${askLabel}`,
      subPrompt: '【論理推論】到着した順番（1着〜4着）を頭の中で並べてください',
      options: names,
      correctIndex,
      correctAnswerText: correctPerson,
      explanation: `早い順に並べると「${order.join(' → ')}」となるため、正解は ${correctPerson} です。`,
    };
  } else {
    // 論理思考・認知反射パズル（数値ランダム変奏付き）
    if (difficulty === 'easy') {
      const rankFromFront = Math.floor(Math.random() * 8) + 4;
      const rankFromBack = Math.floor(Math.random() * 8) + 4;
      const totalPeople = rankFromFront + rankFromBack - 1;
      const { options, correctIndex } = buildNumericOptions(
        totalPeople,
        [-2, -1, 1, 2],
        '人'
      );
      return {
        id: `logic-line-${Date.now()}`,
        category: 'logic',
        difficulty,
        inputMode: 'choice',
        question: `1列に並んでいる人のうち、あなたは前から数えて「${rankFromFront}番目」、後ろから数えて「${rankFromBack}番目」です。全部で何人並んでいますか？`,
        subPrompt: '【論理パズル・かんたん】自分が2回数えられている点に注意！',
        options,
        correctIndex,
        correctAnswerText: `${totalPeople}人`,
        explanation: `${rankFromFront} + ${rankFromBack} - 1（自分の重複分）= ${totalPeople}人 です。`,
      };
    } else if (difficulty === 'normal') {
      // 嘘つき箱パズル（正解の箱を毎回ランダムに変更）
      const boxes = ['Aの箱', 'Bの箱', 'Cの箱'];
      const trueBoxIdx = Math.floor(Math.random() * 3); // 0, 1, 2
      let statements = ['', '', ''];
      if (trueBoxIdx === 0) {
        // Aが正解のとき、発言のうち1つだけが真になる組み合わせ
        statements = ['A：ここにはない', 'B：ここにある', 'C：Bにはない'];
        // Aに入っているなら A発言(偽), B発言(偽), C発言(真) -> 真が1つだけ！
      } else if (trueBoxIdx === 1) {
        statements = ['A：ここにある', 'B：ここにはない', 'C：Aにはない'];
        // Bに入っているなら A発言(偽), B発言(偽), C発言(真) -> 真が1つだけ！
      } else {
        statements = ['A：Bにある', 'B：ここにはない', 'C：ここにはない'];
        // Cに入っているなら A発言(偽), B発言(真), C発言(偽) -> 真が1つだけ！
      }
      const opts = [...boxes, '特定できない'];
      return {
        id: `logic-box-${Date.now()}`,
        category: 'logic',
        difficulty,
        inputMode: 'choice',
        question: `A・B・Cの3つの箱のどれか1つに宝が入っています。「${statements.join('」「')}」のうち、本当のことを言っているラベルは【1つだけ】です。宝はどこ？`,
        subPrompt: '【論理推論・中級】矛盾しない箱を1つ見つけてください',
        options: opts,
        correctIndex: trueBoxIdx,
        correctAnswerText: boxes[trueBoxIdx],
        explanation: `宝が「${boxes[trueBoxIdx]}」にあると仮定すると、本当のラベルがちょうど1つだけになり矛盾しません。`,
      };
    } else {
      // 差額と合計の認知反射問題（数値を毎回ランダム生成）
      const smallPrice = (Math.floor(Math.random() * 8) + 2) * 50; // 100, 150, ... 450円
      const diffPrice = (Math.floor(Math.random() * 4) + 1) * 1000; // 1000, 2000, 3000, 4000円
      const totalPrice = diffPrice + smallPrice * 2;
      const trapPrice = smallPrice * 2; // 直感で引いてしまった時のひっかけ値

      const distractors = new Set<number>([
        trapPrice,
        smallPrice + 50,
        Math.max(50, smallPrice - 50),
        trapPrice + 100,
      ]);
      distractors.delete(smallPrice);
      const optsNums = shuffleArray([
        smallPrice,
        ...Array.from(distractors).slice(0, 3),
      ]);

      return {
        id: `logic-crt-${Date.now()}`,
        category: 'logic',
        difficulty,
        inputMode: 'choice',
        question: `ケースと本体の合計は ${totalPrice}円 です。本体はケースより ${diffPrice}円 高いです。では、ケースの値段はいくら？`,
        subPrompt: `【論理・上級】直感（${trapPrice}円）はひっかけです！落ち着いて計算してください`,
        options: optsNums.map((n) => `${n}円`),
        correctIndex: optsNums.indexOf(smallPrice),
        correctAnswerText: `${smallPrice}円`,
        explanation: `ケースが ${smallPrice}円、本体が ${diffPrice + smallPrice}円 のときに「差額が${diffPrice}円・合計が${totalPrice}円」になります。`,
      };
    }
  }
}
