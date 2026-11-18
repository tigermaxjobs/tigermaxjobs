// Tigermax Career Intelligence: test catalogue, items, prices and packs.
// Every test has a defined construct, framework, scoring method, interpretation rule and a validation status.
// Items are original Tigermax wording written for Zimbabwean and international workplaces.
// Prices are in USD. Edit them here (Render redeploys automatically).

export type Likert = { id: string; type: 'likert'; text: string; dim: string; key: 1 | -1 };
export type Choice = { id: string; type: 'choice'; text: string; options: string[]; answer: number; level: 1 | 2 | 3; dim?: string };
export type Sjt = { id: string; type: 'sjt'; text: string; options: { t: string; s: 0 | 1 | 2 | 3 }[]; dim: string };
export type Forced = { id: string; type: 'forced'; text?: string; a: string; b: string; dim: string };
export type Item = Likert | Choice | Sjt | Forced;

export type Area = 'personality' | 'motivation' | 'aptitude' | 'judgement' | 'emotional';
export const AREAS: Record<Area, string> = {
  personality: 'Personality & work style',
  motivation: 'Interests, values & preferences',
  aptitude: 'Cognitive aptitude',
  judgement: 'Judgement & practical skills',
  emotional: 'Emotional intelligence, learning & leadership',
};

export type Test = {
  code: string; name: string; short: string; area: Area; version: string;
  construct: string;          // what it measures
  framework: string;          // scientific basis
  format: string;             // how it is delivered
  scoring: string;            // scoring methodology
  interpretation: string;     // how results are read
  minutes: number; price: number;  // price per timed sitting; a new sitting after running out of time costs the same
  adaptive?: boolean; serve?: number; // adaptive tests serve `serve` items from the bank
  scale?: 'agree' | 'enjoy' | 'important';
  dims: Record<string, { label: string; high: string; low: string }>;
  items: Item[];
};

const L = (id: string, dim: string, key: 1 | -1, text: string): Likert => ({ id, type: 'likert', dim, key, text });
const C = (id: string, level: 1 | 2 | 3, text: string, options: string[], answer: number): Choice => ({ id, type: 'choice', level, text, options, answer });
const S = (id: string, dim: string, text: string, ...o: [string, 0 | 1 | 2 | 3][]): Sjt => ({ id, type: 'sjt', dim, text, options: o.map(([t, s]) => ({ t, s })) });
const F = (id: string, dim: string, a: string, b: string): Forced => ({ id, type: 'forced', dim, a, b, text: 'Which describes your ideal job better?' });

export const SCALES = {
  agree: ['Strongly disagree', 'Disagree', 'Neither', 'Agree', 'Strongly agree'],
  enjoy: ['Would dislike it', 'Would not enjoy it much', 'Not sure', 'Would enjoy it', 'Would love it'],
  important: ['Not important', 'Slightly important', 'Moderately important', 'Very important', 'Essential'],
};

export const TESTS: Test[] = [
  {
    code: 'preferences', name: 'Workplace Preferences', short: 'The kind of workplace you work best in', area: 'motivation', version: '1.0',
    construct: 'Preferred work environment on five bipolar dimensions: structure, social setting, pace, physical setting and focus of work.',
    framework: 'Person–environment fit theory (Dawis & Lofquist, Theory of Work Adjustment); forced-choice preference format.',
    format: '10 forced-choice pairs with a "no strong preference" option.', minutes: 8, price: 0,
    scoring: 'Each choice scores −1 (first pole), 0 (no preference) or +1 (second pole); two items per dimension give −2 to +2.',
    interpretation: 'Scores of ±2 are a clear preference, ±1 a leaning, 0 flexible. Preferences describe comfort, not ability.',
    dims: {
      structure: { label: 'Structure', low: 'Clear routines and procedures', high: 'Freedom to decide how to work' },
      social: { label: 'Social setting', low: 'Working closely in a team', high: 'Working independently' },
      pace: { label: 'Pace', low: 'Steady, predictable workload', high: 'Fast-paced, changing work' },
      setting: { label: 'Physical setting', low: 'Office or indoor work', high: 'Field, site, outdoor or travelling work' },
      focus: { label: 'Focus of work', low: 'People: clients, learners, patients', high: 'Information, systems, machines or products' },
    },
    items: [
      F('wp1', 'structure', 'Clear procedures and set routines', 'Deciding how to do things as I go'),
      F('wp2', 'structure', 'Detailed instructions from my manager', 'Freedom to work things out myself'),
      F('wp3', 'social', 'Working closely with a team all day', 'Working on my own tasks independently'),
      F('wp4', 'social', 'A shared, busy workspace', 'A quiet space of my own'),
      F('wp5', 'pace', 'A steady, predictable workload', 'A fast-paced workload with tight deadlines'),
      F('wp6', 'pace', 'Doing one task thoroughly at a time', 'Juggling several tasks at once'),
      F('wp7', 'setting', 'Office or indoor work', 'Field, site or outdoor work'),
      F('wp8', 'setting', 'The same workplace every day', 'Travelling to different places'),
      F('wp9', 'focus', 'Dealing with people: clients, learners or patients', 'Working with information, systems or machines'),
      F('wp10', 'focus', 'Helping someone face to face', 'Producing a report, product or repair'),
    ],
  },
  {
    code: 'personality', name: 'Work Personality (Big Five)', short: 'How you tend to think, feel and behave at work', area: 'personality', version: '1.0', scale: 'agree',
    construct: 'Five broad personality traits expressed at work: Openness, Conscientiousness, Extraversion, Agreeableness and Emotional Stability.',
    framework: 'Five-Factor Model (Costa & McCrae; Goldberg). Work-contextualised items, balanced positive and reverse keying (IPIP approach).',
    format: '30 statements rated on a 5-point agreement scale.', minutes: 15, price: 3,
    scoring: 'Reverse-keyed items are flipped (6 − response); the six items per trait are averaged (1–5).',
    interpretation: 'Below 2.6 = lower, 2.6–3.6 = moderate, above 3.6 = higher (provisional bands until Zimbabwean norms are built). No trait level is good or bad; each suits different roles.',
    dims: {
      O: { label: 'Openness to experience', high: 'Curious, enjoys new ideas and methods', low: 'Practical, prefers proven methods' },
      C: { label: 'Conscientiousness', high: 'Organised, dependable, detail-focused', low: 'Flexible, spontaneous, may need structure to finish tasks' },
      E: { label: 'Extraversion', high: 'Outgoing, energised by people, speaks up', low: 'Reserved, focused, prefers smaller groups' },
      A: { label: 'Agreeableness', high: 'Cooperative, supportive, trusting', low: 'Direct, competitive, challenges others' },
      ES: { label: 'Emotional stability', high: 'Calm and steady under pressure', low: 'Feels pressure strongly, alert to risks' },
    },
    items: [
      L('p1', 'O', 1, 'I enjoy finding new ways to do routine tasks.'),
      L('p2', 'C', 1, 'I finish tasks by the deadline I agreed to.'),
      L('p3', 'E', 1, 'I feel energised after working with a group of people.'),
      L('p4', 'A', 1, 'I go out of my way to help a colleague who is struggling.'),
      L('p5', 'ES', 1, 'I stay calm when things go wrong at work.'),
      L('p6', 'O', -1, 'I prefer to stick to methods I already know.'),
      L('p7', 'C', -1, 'I leave tasks unfinished when something more interesting comes up.'),
      L('p8', 'E', -1, 'I prefer to stay in the background at work events.'),
      L('p9', 'A', -1, 'I am quick to criticise other people\'s mistakes.'),
      L('p10', 'ES', -1, 'I worry a lot about things that might go wrong.'),
      L('p11', 'O', 1, 'I am curious about how things work in other industries.'),
      L('p12', 'C', 1, 'I plan my work before I start.'),
      L('p13', 'E', 1, 'I am comfortable speaking up in meetings.'),
      L('p14', 'A', 1, 'I assume people mean well until shown otherwise.'),
      L('p15', 'ES', 1, 'I recover quickly from setbacks.'),
      L('p16', 'O', -1, 'I lose interest when a discussion becomes abstract or theoretical.'),
      L('p17', 'C', -1, 'My workspace and files are often disorganised.'),
      L('p18', 'E', -1, 'Long periods of interaction with others tire me out.'),
      L('p19', 'A', -1, 'I find it hard to sympathise with other people\'s problems at work.'),
      L('p20', 'ES', -1, 'I get irritated easily when I am under pressure.'),
      L('p21', 'O', 1, 'I like working with ideas, even when they have no immediate use.'),
      L('p22', 'C', 1, 'I check my work for mistakes before handing it in.'),
      L('p23', 'E', 1, 'I easily start conversations with people I do not know.'),
      L('p24', 'A', 1, 'In a disagreement I try to find a solution that works for everyone.'),
      L('p25', 'ES', 1, 'I rarely feel overwhelmed by pressure.'),
      L('p26', 'O', -1, 'I rarely look for new ways of seeing a problem.'),
      L('p27', 'C', -1, 'I sometimes forget commitments I made to colleagues.'),
      L('p28', 'E', -1, 'I keep my opinions to myself in group discussions.'),
      L('p29', 'A', -1, 'Winning an argument matters more to me than keeping a good working relationship.'),
      L('p30', 'ES', -1, 'Criticism of my work stays on my mind for days.'),
    ],
  },
  {
    code: 'interests', name: 'Occupational Interests (RIASEC)', short: 'The kinds of work activities you enjoy', area: 'motivation', version: '1.0', scale: 'enjoy',
    construct: 'Interest in six types of work activity: Realistic, Investigative, Artistic, Social, Enterprising and Conventional.',
    framework: 'Holland\'s RIASEC theory of vocational personalities and work environments; activity-preference format as used in O*NET Interest Profiler.',
    format: '30 work activities rated on how much you would enjoy them.', minutes: 12, price: 2,
    scoring: 'Ratings (1–5) are averaged per type. Your three highest types form your Holland code (e.g. SEC).',
    interpretation: 'The Holland code is compared with the code of each occupation. Interest shows what you are likely to enjoy, not what you can already do.',
    dims: {
      R: { label: 'Realistic (doers)', high: 'Hands-on work with tools, machines, plants or animals', low: 'Less drawn to hands-on, physical work' },
      I: { label: 'Investigative (thinkers)', high: 'Analysing, researching and solving complex problems', low: 'Less drawn to research and analysis' },
      A: { label: 'Artistic (creators)', high: 'Designing, writing, performing and creating', low: 'Less drawn to creative, unstructured work' },
      S: { label: 'Social (helpers)', high: 'Teaching, caring, advising and serving people', low: 'Less drawn to helping and caring roles' },
      E: { label: 'Enterprising (persuaders)', high: 'Selling, leading, negotiating and starting ventures', low: 'Less drawn to selling and leading' },
      C: { label: 'Conventional (organisers)', high: 'Records, data, procedures and accuracy', low: 'Less drawn to routine, detailed record work' },
    },
    items: [
      ['R', 'Repairing machines or equipment'], ['I', 'Analysing data to find the cause of a problem'], ['A', 'Designing posters, logos or websites'],
      ['S', 'Teaching or training other people'], ['E', 'Selling a product or service'], ['C', 'Keeping accurate financial records'],
      ['R', 'Operating heavy machinery or vehicles'], ['I', 'Doing laboratory tests or experiments'], ['A', 'Writing stories, articles or scripts'],
      ['S', 'Caring for sick or elderly people'], ['E', 'Starting and running your own business'], ['C', 'Entering and checking data in a system'],
      ['R', 'Building or installing things such as roofs, cabinets or wiring'], ['I', 'Studying how the human body or diseases work'], ['A', 'Performing music, drama or dance'],
      ['S', 'Helping someone through a personal problem'], ['E', 'Leading a team to reach a target'], ['C', 'Organising files, stock or records'],
      ['R', 'Working outdoors on a farm, mine or construction site'], ['I', 'Solving complex mathematical or technical problems'], ['A', 'Taking photographs or making videos'],
      ['S', 'Organising community or youth programmes'], ['E', 'Negotiating a deal or contract'], ['C', 'Following procedures to process applications or payments'],
      ['R', 'Using tools to make or fix things'], ['I', 'Researching a question until you find the answer'], ['A', 'Designing interiors, clothing or products'],
      ['S', 'Helping customers solve their problems'], ['E', 'Persuading people to support an idea'], ['C', 'Preparing schedules, reports or budgets'],
    ].map(([d, t], i) => L('r' + (i + 1), d, 1, t)),
  },
  {
    code: 'values', name: 'Work Values & Motivation', short: 'What you need from a job to stay motivated', area: 'motivation', version: '1.0', scale: 'important',
    construct: 'Importance of six work values: Achievement, Security, Autonomy, Service, Recognition & Rewards, Growth.',
    framework: 'Theory of Work Adjustment work-value dimensions (Minnesota Importance Questionnaire tradition) and Self-Determination Theory.',
    format: '18 job features rated for importance.', minutes: 10, price: 2,
    scoring: 'Ratings (1–5) averaged per value; values are ranked from most to least important.',
    interpretation: 'Your top three values are what a job must offer for long-term satisfaction and retention.',
    dims: {
      achievement: { label: 'Achievement', high: 'Needs visible results and challenge', low: 'Less driven by challenge' },
      security: { label: 'Security', high: 'Needs stability and predictable income', low: 'Comfortable with change and contract work' },
      autonomy: { label: 'Autonomy', high: 'Needs freedom over how and when to work', low: 'Comfortable with close direction' },
      service: { label: 'Service', high: 'Needs to make a difference to people', low: 'Less driven by helping others' },
      rewards: { label: 'Recognition & rewards', high: 'Needs earning potential and recognition', low: 'Less driven by pay and status' },
      growth: { label: 'Growth', high: 'Needs learning and development', low: 'Prefers to use existing skills' },
    },
    items: [
      ['achievement', 'Work where I can see clear results'], ['security', 'A stable, permanent contract'], ['autonomy', 'Deciding how to do my own work'],
      ['service', 'Making a difference in people\'s lives'], ['rewards', 'High earning potential'], ['growth', 'Learning new skills on the job'],
      ['achievement', 'Being challenged to reach high standards'], ['security', 'A predictable income every month'], ['autonomy', 'Flexible working hours'],
      ['service', 'Work that benefits my community'], ['rewards', 'Being recognised for good work'], ['growth', 'Access to training and qualifications'],
      ['achievement', 'Completing difficult tasks successfully'], ['security', 'Working for an established organisation'], ['autonomy', 'Working without close supervision'],
      ['service', 'Helping people directly'], ['rewards', 'Clear opportunities for promotion'], ['growth', 'Work that keeps changing and developing me'],
    ].map(([d, t], i) => L('v' + (i + 1), d, 1, t)),
  },
  {
    code: 'numerical', name: 'Numerical Reasoning', short: 'Working with numbers, percentages and data', area: 'aptitude', version: '1.0', adaptive: true, serve: 12,
    construct: 'Ability to solve workplace problems with numbers: arithmetic, percentages, ratios, rates and number series.',
    framework: 'Cognitive ability (Cattell–Horn–Carroll quantitative reasoning, Gq/Gf); general mental ability is among the strongest predictors of job performance (Schmidt & Hunter).',
    format: '12 multiple-choice questions, adaptive: a correct answer raises the difficulty of the next question, a wrong answer lowers it.', minutes: 18, price: 5,
    scoring: 'Ability index = mean difficulty level of the last six questions (1–3), adjusted by accuracy. Calculators allowed.',
    interpretation: 'Index of 2.4 or more = Advanced, 1.7–2.4 = Proficient, below 1.7 = Developing.',
    dims: { g: { label: 'Numerical reasoning', high: 'Handles complex number problems quickly', low: 'Developing; practise percentages and ratios' } },
    items: [
      C('n1', 1, 'Bread costs US$1.20 a loaf. How much do 5 loaves cost?', ['US$5.00', 'US$6.00', 'US$6.20', 'US$7.20'], 1),
      C('n2', 1, 'What is 25% of 80?', ['15', '20', '25', '40'], 1),
      C('n3', 1, 'A worker earns US$12 per day. How much does she earn in 15 days?', ['US$150', 'US$170', 'US$180', 'US$190'], 2),
      C('n4', 1, 'A 200-litre tank is three-quarters full. How many litres are in it?', ['100', '125', '150', '175'], 2),
      C('n5', 1, 'What comes next? 4, 8, 12, 16, …', ['18', '20', '22', '24'], 1),
      C('n6', 1, 'A bus leaves at 07:45 and the journey takes 2 hours 30 minutes. When does it arrive?', ['09:45', '10:05', '10:15', '10:30'], 2),
      C('n7', 2, 'A price of US$40 increases by 15%. What is the new price?', ['US$44', 'US$45', 'US$46', 'US$55'], 2),
      C('n8', 2, 'Men and women in a team of 40 are in the ratio 3 : 5. How many are women?', ['15', '24', '25', '30'], 2),
      C('n9', 2, 'A truck uses 8 litres of diesel per 100 km. How much does it need for 350 km?', ['24 litres', '26 litres', '28 litres', '30 litres'], 2),
      C('n10', 2, 'Sales were 120 units in January, 150 in February and 180 in March. What is the monthly average?', ['140', '150', '160', '170'], 1),
      C('n11', 2, 'What comes next? 2, 6, 18, 54, …', ['108', '150', '162', '216'], 2),
      C('n12', 2, 'After a 20% discount an item costs US$80. What was the original price?', ['US$96', 'US$100', 'US$104', 'US$120'], 1),
      C('n13', 3, 'US$1,000 is invested at 10% interest compounded yearly. What is it worth after 2 years?', ['US$1,100', 'US$1,200', 'US$1,210', 'US$1,221'], 2),
      C('n14', 3, 'Painter A paints a wall in 6 hours; painter B paints it in 3 hours. How long do they take working together?', ['1.5 hours', '2 hours', '2.5 hours', '4.5 hours'], 1),
      C('n15', 3, 'Profit rose from US$50,000 to US$65,000, then fell by 20%. What is the final profit?', ['US$45,000', 'US$52,000', 'US$55,000', 'US$60,000'], 1),
      C('n16', 3, 'What comes next? 1, 4, 9, 16, 25, …', ['30', '34', '36', '49'], 2),
      C('n17', 3, 'If US$1 buys 14 units of currency X, how many US dollars do 3,500 units buy?', ['US$200', 'US$250', 'US$275', 'US$300'], 1),
      C('n18', 3, 'A project is 40% complete after 12 days of steady work. How many days will the whole project take?', ['24', '28', '30', '32'], 2),
    ],
  },
  {
    code: 'verbal', name: 'Verbal Reasoning', short: 'Understanding and reasoning with written information', area: 'aptitude', version: '1.0', adaptive: true, serve: 12,
    construct: 'Ability to understand written workplace information, vocabulary and draw logical conclusions from text.',
    framework: 'Cognitive ability (CHC comprehension-knowledge Gc and reasoning Gf); verbal reasoning formats used in graduate and clerical selection.',
    format: '12 multiple-choice questions, adaptive difficulty.', minutes: 16, price: 5,
    scoring: 'Ability index = mean difficulty level of the last six questions (1–3), adjusted by accuracy.',
    interpretation: 'Index of 2.4 or more = Advanced, 1.7–2.4 = Proficient, below 1.7 = Developing.',
    dims: { g: { label: 'Verbal reasoning', high: 'Reads and reasons with complex text', low: 'Developing; practise reading reports and drawing conclusions' } },
    items: [
      C('w1', 1, 'Which word is closest in meaning to "punctual"?', ['Early', 'On time', 'Polite', 'Quick'], 1),
      C('w2', 1, 'Which word is the opposite of "expand"?', ['Grow', 'Contract', 'Extend', 'Open'], 1),
      C('w3', 1, '"All workers on site must wear safety boots. Tendai is a worker on site." Which must be true?', ['Tendai may wear safety boots', 'Tendai must wear safety boots', 'Tendai is a supervisor', 'Cannot say'], 1),
      C('w4', 1, 'Which spelling is correct?', ['Recieve', 'Receive', 'Receeve', 'Receve'], 1),
      C('w5', 1, '"The manager asked us to ___ the report by Friday."', ['submit', 'submission', 'submitted', 'submitting'], 0),
      C('w6', 1, 'Doctor is to hospital as teacher is to …', ['Student', 'School', 'Lesson', 'Book'], 1),
      C('w7', 2, 'Which word is closest in meaning to "mitigate"?', ['Worsen', 'Reduce', 'Ignore', 'Delay'], 1),
      C('w8', 2, '"Travel costs are reimbursed only when original receipts are submitted within 30 days." A claim is sent after 45 days with receipts. Under this rule it…', ['will be reimbursed', 'will not be reimbursed', 'will be half reimbursed', 'cannot say'], 1),
      C('w9', 2, 'Which word is the opposite of "transparent"?', ['Clear', 'Opaque', 'Honest', 'Visible'], 1),
      C('w10', 2, 'Budget is to spending as plan is to …', ['Action', 'Money', 'Paper', 'Manager'], 0),
      C('w11', 2, 'Which sentence is correct?', ['Each of the workers have a contract.', 'Each of the workers has a contract.', 'Each of the worker has a contract.', 'Each of the workers having a contract.'], 1),
      C('w12', 2, '"Some contractors are engineers. All engineers are graduates." Which must be true?', ['All contractors are graduates', 'Some contractors are graduates', 'No contractors are graduates', 'All graduates are engineers'], 1),
      C('w13', 3, 'Which word is closest in meaning to "ubiquitous"?', ['Rare', 'Found everywhere', 'Unclear', 'Unique'], 1),
      C('w14', 3, '"Remote work cut office costs by 30%, but productivity data was mixed: sales improved while support declined." Which conclusion is best supported?', ['Remote work improved productivity in all teams', 'Remote work saved costs, but its effect on productivity varied by team', 'Remote work should be stopped', 'Support teams cost 30% more'], 1),
      C('w15', 3, '"No safety officer may sign off an inspection they carried out. Rudo, a safety officer, signed off inspection 14." If the rule was followed, which must be true?', ['Rudo carried out inspection 14', 'Rudo did not carry out inspection 14', 'Inspection 14 is invalid', 'Cannot say'], 1),
      C('w16', 3, 'Prologue is to novel as preamble is to …', ['Constitution', 'Chapter', 'Author', 'Ending'], 0),
      C('w17', 3, '"The evidence was ___, so the panel could not reach a firm conclusion."', ['conclusive', 'ambiguous', 'compelling', 'decisive'], 1),
      C('w18', 3, 'Which word is the opposite of "frugal"?', ['Thrifty', 'Extravagant', 'Careful', 'Poor'], 1),
    ],
  },
  {
    code: 'abstract', name: 'Logical & Abstract Reasoning', short: 'Spotting patterns and solving new problems', area: 'aptitude', version: '1.0', adaptive: true, serve: 12,
    construct: 'Fluid reasoning: finding rules in sequences, codes and logical statements without relying on prior knowledge.',
    framework: 'Cognitive ability (CHC fluid reasoning Gf); series-completion and syllogism formats with low cultural loading.',
    format: '12 multiple-choice questions, adaptive difficulty.', minutes: 16, price: 5,
    scoring: 'Ability index = mean difficulty level of the last six questions (1–3), adjusted by accuracy.',
    interpretation: 'Index of 2.4 or more = Advanced, 1.7–2.4 = Proficient, below 1.7 = Developing. Strong fluid reasoning predicts how quickly you learn new tasks.',
    dims: { g: { label: 'Logical reasoning', high: 'Finds rules and patterns quickly', low: 'Developing; practise puzzles and sequences' } },
    items: [
      C('a1', 1, 'What comes next? A, C, E, G, …', ['H', 'I', 'J', 'K'], 1),
      C('a2', 1, 'What comes next? 5, 10, 15, 20, …', ['22', '24', '25', '30'], 2),
      C('a3', 1, 'Which is the odd one out?', ['Circle', 'Triangle', 'Square', 'Cube'], 3),
      C('a4', 1, 'What comes next? ▲ ▼ ▲ ▼ …', ['▲', '▼', '◆', '●'], 0),
      C('a5', 1, 'If CAT is written 3-1-20, how is DOG written?', ['4-15-7', '4-14-7', '3-15-7', '4-15-8'], 0),
      C('a6', 1, 'What comes next? 100, 90, 80, 70, …', ['50', '60', '65', '75'], 1),
      C('a7', 2, 'What comes next? 1, 1, 2, 3, 5, 8, …', ['11', '12', '13', '15'], 2),
      C('a8', 2, 'What comes next? Z, X, V, T, …', ['S', 'R', 'Q', 'P'], 1),
      C('a9', 2, 'Which is the odd one out?', ['2', '3', '5', '9'], 3),
      C('a10', 2, 'What comes next? 3, 6, 11, 18, 27, …', ['36', '38', '39', '40'], 1),
      C('a11', 2, '"All blips are zops. No zops are kins." Which must be true?', ['Some blips are kins', 'No blips are kins', 'All kins are blips', 'Cannot say'], 1),
      C('a12', 2, 'Rows follow the same rule: (2, 4, 8), (3, 9, 27), (4, 16, ?)', ['32', '48', '64', '256'], 2),
      C('a13', 3, 'What comes next? 2, 3, 5, 9, 17, …', ['25', '31', '33', '34'], 2),
      C('a14', 3, 'What comes next? B, E, I, N, …', ['R', 'S', 'T', 'U'], 2),
      C('a15', 3, 'Which is the odd one out?', ['121', '144', '169', '210'], 3),
      C('a16', 3, 'Five people queue. Eli is first and Dudu is last. Chipo is ahead of Ben, and Ama is behind Ben. Who is third?', ['Ama', 'Ben', 'Chipo', 'Eli'], 1),
      C('a17', 3, 'What comes next? 1, 8, 27, 64, …', ['100', '125', '128', '216'], 1),
      C('a18', 3, 'A code turns 2 into 5, 3 into 10 and 4 into 17. What does it turn 6 into?', ['26', '35', '36', '37'], 3),
    ],
  },
  {
    code: 'sjt', name: 'Workplace Judgement (SJT)', short: 'How you handle real workplace situations', area: 'judgement', version: '1.0',
    construct: 'Practical judgement in five competency areas: integrity, teamwork, customer focus, problem solving and reliability.',
    framework: 'Situational judgement testing (Motowidlo; McDaniel et al.); options keyed for effectiveness against SIOP selection principles.',
    format: '10 scenarios; choose the most effective response.', minutes: 20, price: 4,
    scoring: 'Each option carries an effectiveness score from 0 to 3 set by a recruiter panel; scores are averaged per competency and overall (0–3).',
    interpretation: 'Average of 2.4 or more = Strong, 1.6–2.4 = Sound, below 1.6 = Developing.',
    dims: {
      integrity: { label: 'Integrity', high: 'Acts honestly and follows policy', low: 'Review ethics and reporting procedures' },
      teamwork: { label: 'Teamwork', high: 'Supports colleagues and shared goals', low: 'Practise collaborative responses' },
      customer: { label: 'Customer focus', high: 'Calm, helpful and follows through', low: 'Build customer-handling skills' },
      problem: { label: 'Problem solving', high: 'Finds practical solutions and communicates', low: 'Practise prioritising and escalating' },
      reliability: { label: 'Reliability', high: 'Owns mistakes and communicates early', low: 'Build habits of early communication' },
    },
    items: [
      S('s1', 'integrity', 'You notice a colleague has recorded more hours on the timesheet than they worked.',
        ['Speak to them privately and encourage them to correct it; raise it with your supervisor if it continues', 3], ['Report them to management straight away', 2], ['Ignore it; it is not your business', 1], ['Mention it to other colleagues to see if they noticed', 0]),
      S('s2', 'integrity', 'A supplier offers you a gift voucher "for your help" while you are evaluating their quotation.',
        ['Decline politely and tell your supervisor, following company policy', 3], ['Accept it but make sure it does not influence you', 0], ['Decline it without telling anyone', 2], ['Ask them to give it to you after the contract is awarded', 0]),
      S('s3', 'teamwork', 'Your team will miss a deadline because one member\'s part is late.',
        ['Talk to the team about how to share the remaining work and offer to help', 3], ['Tell the supervisor it is that member\'s fault', 1], ['Do nothing; it is their responsibility', 0], ['Finish their part yourself without telling them', 1]),
      S('s4', 'teamwork', 'In a meeting, a quiet new colleague\'s good idea is ignored.',
        ['Bring the idea back up and credit them', 3], ['Suggest privately afterwards that they push it next time', 2], ['Present the idea later as your own', 0], ['Say nothing', 1]),
      S('s5', 'customer', 'A customer is shouting at you because their order arrived late.',
        ['Stay calm, listen, apologise, explain what you will do and follow up', 3], ['Explain that the delay was not your fault', 1], ['Ask them to come back when they are calm', 0], ['Offer a full refund immediately without checking the policy', 1]),
      S('s6', 'customer', 'A customer asks a question you cannot answer.',
        ['Say you will find out and get back by a specific time, then do it', 3], ['Guess an answer to keep them happy', 0], ['Introduce them to a colleague who knows', 2], ['Tell them you do not know', 1]),
      S('s7', 'problem', 'The printer fails an hour before a tender must be delivered in hard copy.',
        ['Arrange another printer or print shop straight away and inform your manager', 3], ['Wait for IT to fix it', 1], ['Submit late with an explanation', 0], ['Ask the client whether a scanned copy is acceptable while you arrange printing', 2]),
      S('s8', 'problem', 'Two managers give you urgent tasks with the same deadline.',
        ['Tell both managers and ask them to agree the priority', 3], ['Do the senior manager\'s task without telling the other', 1], ['Do half of each', 0], ['Work overtime to try to finish both without telling anyone', 2]),
      S('s9', 'reliability', 'You wake up ill on the day you are due to present to a client.',
        ['Tell your supervisor as early as possible and hand over your materials', 3], ['Send a message after the meeting time', 0], ['Go in anyway even though you may infect others', 1], ['Ask a colleague to tell your supervisor for you', 1]),
      S('s10', 'reliability', 'You find an error in a report you have already sent to a client.',
        ['Tell your supervisor, correct it and send the corrected version promptly', 3], ['Hope nobody notices', 0], ['Fix it quietly in the next version', 1], ['Say the data source was wrong', 0]),
    ],
  },
  {
    code: 'digital', name: 'Digital Workplace Skills (simulation)', short: 'Spreadsheets, email, online safety and remote work', area: 'judgement', version: '1.0',
    construct: 'Practical digital competence for office and remote work: spreadsheets, email, files, data protection and online safety.',
    framework: 'EU DigComp 2.2 digital competence framework; work-sample (simulation) approach to competency verification.',
    format: '12 practical task questions based on everyday office and remote-work situations.', minutes: 15, price: 4,
    scoring: 'One point per correct answer, reported per skill and overall (0–100% of tasks correct, shown as a band).',
    interpretation: '10–12 correct = Strong, 7–9 = Sound, 0–6 = Developing.',
    dims: {
      sheets: { label: 'Spreadsheets', high: 'Uses formulas confidently', low: 'Practise SUM, AVERAGE, IF and references' },
      comms: { label: 'Email & online communication', high: 'Communicates professionally online', low: 'Review email and video-call etiquette' },
      safety: { label: 'Data protection & online safety', high: 'Protects data and spots scams', low: 'Review phishing and data-privacy basics' },
    },
    items: [
      { ...C('d1', 1, 'Which formula adds the values in cells A1 to A10?', ['=SUM(A1:A10)', '=ADD(A1-A10)', '=TOTAL(A1;A10)', 'SUM A1 to A10'], 0), dim: 'sheets' },
      { ...C('d2', 1, 'Which formula gives the average of B2 to B20?', ['=MEAN(B2:B20)', '=AVERAGE(B2:B20)', '=AVG(B2-B20)', '=B2:B20/2'], 1), dim: 'sheets' },
      { ...C('d3', 1, 'An email from "Tax Refunds Office" asks you to click a link and enter your bank PIN. What do you do?', ['Click the link to check', 'Reply asking if it is genuine', 'Do not click; report it as phishing and check through official channels', 'Forward it to colleagues'], 2), dim: 'safety' },
      { ...C('d4', 2, 'What is the best way to send a 40 MB document to a client?', ['Attach it directly', 'Share a cloud link with the right permissions', 'Split it into 10 emails', 'Print and scan it'], 1), dim: 'comms' },
      { ...C('d5', 1, 'Which password is strongest?', ['Tendai1990', 'password123', 'R7#qLm!2vZ9p', 'Harare2026'], 2), dim: 'safety' },
      { ...C('d6', 2, 'In a spreadsheet formula, what does $A$1 mean?', ['A currency cell', 'An absolute reference that does not change when copied', 'A locked cell', 'The total of column A'], 1), dim: 'sheets' },
      { ...C('d7', 2, 'A client\'s CV contains personal data. Who may you share it with?', ['Anyone in the company', 'Only people who need it for the purpose agreed with the client', 'Social media, for reach', 'Any employer who asks'], 1), dim: 'safety' },
      { ...C('d8', 1, 'Which format is best for a final document the reader should not edit?', ['.docx', '.pdf', '.txt', '.xlsx'], 1), dim: 'comms' },
      { ...C('d9', 1, 'Which keyboard shortcut undoes the last action on Windows?', ['Ctrl+Z', 'Ctrl+U', 'Ctrl+Y', 'Alt+F4'], 0), dim: 'sheets' },
      { ...C('d10', 2, 'You email 50 clients and must not show their addresses to each other. Put them in…', ['To', 'Cc', 'Bcc', 'Reply all'], 2), dim: 'comms' },
      { ...C('d11', 3, 'What does =IF(C2>=50,"Pass","Fail") return when C2 is 50?', ['Pass', 'Fail', 'An error', '50'], 0), dim: 'sheets' },
      { ...C('d12', 2, 'Which is most professional for a video interview?', ['Camera off to save data', 'A quiet place, camera at eye level, connection tested beforehand', 'Joining from a taxi', 'Joining a few minutes late'], 1), dim: 'comms' },
    ],
  },
  {
    code: 'customer', name: 'Customer Service (simulation)', short: 'Handling customers in person, by phone and online', area: 'judgement', version: '1.0',
    construct: 'Customer service competence: service recovery, communication, policy compliance and follow-through.',
    framework: 'Situational judgement / work-sample method; competencies aligned to occupational standards for customer service roles.',
    format: '8 customer scenarios; choose the most effective response.', minutes: 12, price: 3,
    scoring: 'Each option carries an effectiveness score from 0 to 3; averaged overall (0–3).',
    interpretation: 'Average of 2.4 or more = Strong, 1.6–2.4 = Sound, below 1.6 = Developing.',
    dims: { service: { label: 'Customer service', high: 'Resolves issues calmly and follows through', low: 'Practise service recovery and follow-up' } },
    items: [
      S('c1', 'service', 'A regular customer asks for a discount you are not allowed to give.', ['Explain politely that you cannot, and offer what you can, such as a current promotion or the manager\'s view', 3], ['Give the discount anyway', 0], ['Simply say no', 1], ['Tell them to ask the manager without explaining', 1]),
      S('c2', 'service', 'A customer is waiting at the counter while the phone rings.', ['Acknowledge the customer, answer the phone and offer the caller a quick callback', 3], ['Ignore the customer and take a long call', 0], ['Let the phone ring', 1], ['Serve whoever is louder', 0]),
      S('c3', 'service', 'A customer returns a faulty product bought yesterday.', ['Apologise, check the receipt, apply the returns policy and record the fault', 3], ['Say it must have been misused', 0], ['Refund outside the policy to avoid trouble', 1], ['Tell them to contact the manufacturer', 1]),
      S('c4', 'service', 'A customer posts a complaint about your company on social media.', ['Reply politely in public, move to private messages to resolve it and report it internally', 3], ['Ignore it', 0], ['Argue in the comments', 0], ['Post a standard copied reply only', 1]),
      S('c5', 'service', 'A customer speaks a language you are not fluent in.', ['Use simple words and gestures, and find a colleague who speaks the language', 3], ['Ask them to come back with someone', 1], ['Pretend to understand', 0], ['Serve the next customer', 0]),
      S('c6', 'service', 'You promised to call back today, but the information is not ready.', ['Call at the agreed time, explain and give a new time', 3], ['Wait until it is ready', 1], ['Do not call', 0], ['Send a vague message', 1]),
      S('c7', 'service', 'A customer is rude and insults you.', ['Stay calm, set a polite boundary, focus on solving it and involve a supervisor if it continues', 3], ['Insult them back', 0], ['Hang up or walk away immediately', 1], ['Stay silent and take it', 1]),
      S('c8', 'service', 'You notice a customer was overcharged last week.', ['Contact them, apologise, refund the difference and report it', 3], ['Leave it', 0], ['Fix it only if they complain', 0], ['Tell a colleague', 1]),
    ],
  },
  {
    code: 'eq', name: 'Emotional Intelligence (self-report)', short: 'Understanding and managing emotions at work', area: 'emotional', version: '1.0', scale: 'agree',
    construct: 'Trait emotional intelligence in four areas: self-awareness, self-regulation, empathy and social skill.',
    framework: 'Mixed/trait models of emotional intelligence (Goleman; Petrides). Self-report, so it shows how you see yourself.',
    format: '16 statements rated on a 5-point agreement scale.', minutes: 10, price: 3,
    scoring: 'Reverse-keyed items flipped; four items averaged per area (1–5).',
    interpretation: 'Below 2.6 = developing, 2.6–3.6 = moderate, above 3.6 = strong. Self-report: compare with feedback from others.',
    dims: {
      awareness: { label: 'Self-awareness', high: 'Knows own emotions and triggers', low: 'Build awareness of reactions' },
      regulation: { label: 'Self-regulation', high: 'Manages emotions under pressure', low: 'Practise pausing before reacting' },
      empathy: { label: 'Empathy', high: 'Reads and respects others\' feelings', low: 'Practise active listening' },
      social: { label: 'Social skill', high: 'Handles conflict and adapts communication', low: 'Practise difficult conversations' },
    },
    items: [
      L('e1', 'awareness', 1, 'I can tell what I am feeling and why.'), L('e2', 'regulation', 1, 'I think before reacting when I am angry.'),
      L('e3', 'empathy', 1, 'I notice when a colleague is upset even if they do not say so.'), L('e4', 'social', 1, 'I can handle disagreements without damaging relationships.'),
      L('e5', 'awareness', 1, 'I know which situations make me lose patience.'), L('e6', 'regulation', 1, 'I can stay focused even when I am upset.'),
      L('e7', 'empathy', 1, 'I try to see situations from other people\'s point of view.'), L('e8', 'social', 1, 'I adjust how I communicate for different people.'),
      L('e9', 'awareness', 1, 'I am aware of how my mood affects my work.'), L('e10', 'regulation', 1, 'I can calm myself down after a stressful event.'),
      L('e11', 'empathy', 1, 'I listen without interrupting when someone shares a problem.'), L('e12', 'social', 1, 'I can help a tense group calm down.'),
      L('e13', 'awareness', -1, 'I am often surprised by my own reactions.'), L('e14', 'regulation', -1, 'I say things I regret when I am frustrated.'),
      L('e15', 'empathy', -1, 'I find it hard to understand why people react emotionally.'), L('e16', 'social', -1, 'I avoid difficult conversations even when they are needed.'),
    ],
  },
  {
    code: 'agility', name: 'Learning Agility', short: 'How quickly you learn and adapt', area: 'emotional', version: '1.0', scale: 'agree',
    construct: 'Willingness and ability to learn from experience in four areas: mental, people, change and results agility.',
    framework: 'Learning agility model (Lombardo & Eichinger; De Meuse); predictor of potential and readiness for reskilling.',
    format: '12 statements rated on a 5-point agreement scale.', minutes: 8, price: 3,
    scoring: 'Reverse-keyed items flipped; three items averaged per area (1–5).',
    interpretation: 'Below 2.6 = developing, 2.6–3.6 = moderate, above 3.6 = strong. High learning agility supports upskilling and career changes.',
    dims: {
      mental: { label: 'Mental agility', high: 'Enjoys learning new things in depth', low: 'Prefers familiar knowledge' },
      people: { label: 'People agility', high: 'Seeks and uses feedback', low: 'Practise asking for feedback' },
      change: { label: 'Change agility', high: 'Adapts quickly to new situations', low: 'Prefers stability' },
      results: { label: 'Results agility', high: 'Delivers in new or difficult conditions', low: 'Build persistence strategies' },
    },
    items: [
      L('g1', 'mental', 1, 'I enjoy learning something completely new.'), L('g2', 'people', 1, 'I ask others for feedback on my work.'),
      L('g3', 'change', 1, 'I adapt quickly when plans or priorities change.'), L('g4', 'results', 1, 'I keep going when a task becomes difficult.'),
      L('g5', 'mental', 1, 'I look for the reasons behind a problem, not just a quick fix.'), L('g6', 'people', 1, 'I learn from people who think differently from me.'),
      L('g7', 'change', 1, 'I volunteer for tasks I have never done before.'), L('g8', 'results', 1, 'I find ways to deliver even with limited resources.'),
      L('g9', 'mental', -1, 'I find it hard to learn a new system or software.'), L('g10', 'people', -1, 'I get defensive when someone points out a mistake.'),
      L('g11', 'change', -1, 'I prefer my job to stay the same.'), L('g12', 'results', 1, 'I reflect on what went wrong so I do better next time.'),
    ],
  },
  {
    code: 'leadership', name: 'Leadership Potential', short: 'Your drive and judgement as a leader', area: 'emotional', version: '1.0', scale: 'agree',
    construct: 'Leadership potential: motivation to lead (self-report) and leadership judgement (situational).',
    framework: 'Motivation to Lead (Chan & Drasgow) and situational judgement of leadership behaviour (transformational leadership; SIOP competency modelling).',
    format: '8 statements plus 6 leadership scenarios.', minutes: 15, price: 4,
    scoring: 'Motivation: statements averaged (1–5). Judgement: scenario options scored 0–3 and averaged.',
    interpretation: 'Motivation above 3.6 and judgement of 2.4+ = strong potential; either below the lower band = developing.',
    dims: {
      motivation: { label: 'Motivation to lead', high: 'Wants responsibility for people and results', low: 'Prefers individual-contributor roles' },
      judgement: { label: 'Leadership judgement', high: 'Handles people situations effectively', low: 'Build skills in feedback and conflict' },
    },
    items: [
      L('l1', 'motivation', 1, 'I like taking responsibility for a group\'s results.'),
      L('l2', 'motivation', 1, 'I step forward to organise people when no one else does.'),
      L('l3', 'motivation', 1, 'I am comfortable making decisions others may not like.'),
      L('l4', 'motivation', 1, 'I enjoy developing other people\'s skills.'),
      L('l5', 'motivation', -1, 'I prefer someone else to take charge.'),
      L('l6', 'motivation', 1, 'I set clear goals for myself and others.'),
      L('l7', 'motivation', 1, 'I take responsibility when my team fails.'),
      L('l8', 'motivation', -1, 'I avoid giving negative feedback.'),
      S('ls1', 'judgement', 'You are the new team leader. Two members are in conflict and it is affecting work.', ['Meet each one, then together, and agree ground rules', 3], ['Tell them to sort it out themselves', 0], ['Move one to another team at once', 1], ['Report them to HR first', 1]),
      S('ls2', 'judgement', 'A team member keeps missing small deadlines.', ['Discuss it privately, find the cause and agree a plan with check-ins', 3], ['Give a formal warning straight away', 1], ['Do their work yourself', 0], ['Raise it in front of the team', 0]),
      S('ls3', 'judgement', 'Your team reaches a big target.', ['Recognise the team publicly and name individual contributions', 3], ['Accept the praise from management yourself', 0], ['Thank them in general terms', 2], ['Move straight on to the next target', 1]),
      S('ls4', 'judgement', 'Management announces a change your team dislikes.', ['Explain the reasons, listen, pass concerns upward and support the change', 3], ['Say you disagree too but they must comply', 1], ['Delay implementing it', 0], ['Implement it without discussion', 1]),
      S('ls5', 'judgement', 'You must choose between two equally qualified people for promotion.', ['Use agreed criteria and evidence, record the decision and give both feedback', 3], ['Choose the one you get along with better', 0], ['Ask the team to vote', 1], ['Postpone the decision', 0]),
      S('ls6', 'judgement', 'A decision you made turned out wrong and cost the team time.', ['Acknowledge it, share what you learned and correct course', 3], ['Change direction quietly without explanation', 1], ['Blame the information you were given', 0], ['Carry on to avoid looking weak', 0]),
    ],
  },
];

export const TEST = (code: string) => TESTS.find(t => t.code === code);
export const PAID_TESTS = TESTS.filter(t => t.price > 0);

// Packs for individuals. A pack buys one timed sitting of each test it lists.
export const PACKS = {
  snapshot: { name: 'Career Snapshot', tests: ['personality', 'interests', 'values'], certificates: 0, price: 5, blurb: 'Personality, interests and values: enough for your first career report.' },
  aptitude: { name: 'Aptitude Pack', tests: ['numerical', 'verbal', 'abstract'], certificates: 0, price: 12, blurb: 'All three reasoning tests, as used in graduate and clerical selection.' },
  full: { name: 'Full Career Intelligence', tests: PAID_TESTS.map(t => t.code), certificates: 1, price: 30, blurb: 'Every test, the full report and one 5-star certificate.' },
} as const;
export type PackKey = keyof typeof PACKS;

// Group packs for employers, schools and programmes (reskilling, upskilling, retention). Each seat = one Full Career Intelligence pack.
export const ORG_PACKS = {
  team10: { name: '10 seats', seats: 10, price: 250 },
  team25: { name: '25 seats', seats: 25, price: 550 },
  team50: { name: '50 seats', seats: 50, price: 1000 },
  team100: { name: '100 seats', seats: 100, price: 1800 },
} as const;
export type OrgPackKey = keyof typeof ORG_PACKS;

export const CERTIFICATE_FEE = 1;          // each certificate download (new serial, current record)
export const REASSESS_AFTER_DAYS = 90;     // a completed test can be retaken after this, at the normal price
export const CONSENT_VERSION = '2026-11-18';

export const VALIDATION_LABEL: Record<string, string> = {
  pilot: 'Pilot: evidence being collected',
  reliability: 'Reliability established',
  validated: 'Validated for local use',
};

export const money = (n: number) => (n ? `US$${n.toFixed(n % 1 ? 2 : 0)}` : 'Free');
