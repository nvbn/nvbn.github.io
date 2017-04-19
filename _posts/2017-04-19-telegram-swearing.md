---
layout:     post
title:      "Telegram bot that speaks like a gopnik"
date:       2017-04-19 16:00:00
keywords:   telegram, javascript, nlp
image:      /assets/telegram_gop.png
---

![book cover](/assets/telegram_gop.png) **TLDR** bot &ndash; [http://t.me/swear_bot](http://t.me/swear_bot) (speaks only in Russian)

Saturday night I thought that it would be nice to write a telegram bot
that will speak like a [gopnik](https://en.wikipedia.org/wiki/Gopnik), 
and sometimes can be used in a conversation (inline mode) to find a relevant reply. So
a few beers later I implemented it. As a language I chose JavaScript, but probably
Python would be better for this kind of project because of a high variety of
NLP related libs. Although for Russian in js exists [Az.js](https://github.com/deNULL/Az.js),
which I've used in the bot, and this library has almost everything needed by the bot.

Worth to mention as the bot speaks in russian, examples below are in russian too, I
add translation in brackets, but sometimes translation doesn't have much sens.

[The bot/telegram API part](https://github.com/nvbn/telegram-swear-bot/blob/master/src/bot.js)
isn't much interesting, it's straightforward and implemented
with [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api).

Move to the interesting part, how it generate replies? The **first option** is to find
trigger word and reply appropriately, like:

>user: Хочу новую машину! (*I want a new car!*)  
>bot: Хотеть не вредно! (*It doesn't harm to wish*)

First of all, we have a list of trigger words regexp and replies, like:
 
~~~javascript
export const TRIGGERS = [
  [/^к[оа]роч[ье]?$/i, 'У кого короче, тот дома сидит!'],
  [/^хо(чу|тим|тят|тел|тела)$/i, 'Хотеть не вредно!'],
];
~~~

Now we need to extract words from our text, it's easy with `Az.Tokens`, and check 
if a word matches any trigger regexp:

~~~javascript
const getWords = (text: string): string[] =>
  Az.Tokens(text)
    .tokens
    .filter(({type}) => type === Az.Tokens.WORD)
    .map(({st, length}) => text.substr(st, length).toLowerCase());
  
const getByWordTrigger = function*(text: string): Iterable<string> {
  for (const word of getWords(text)) {
    for (const [regexp, answer] of constants.TRIGGERS) {
      if (word.match(regexp)) {
        yield answer;
      }
    }
  }
};
~~~

And that little generator would yield all appropriate replies to text based on trigger words.

The **second option** is to reply to question with an amusing question, like:

>user: Когда мы уже пойдём домой? (*When we'll go home?*)  
>bot: А тебя ебёт? (*Why the fuck you care?*)

So it's very easy to implement, we just need to find a question mark at the end of text or
question words such a "когда" (*when*), "где" (*where*) and etc:

~~~javascript
const getAnswerToQuestion = (text: string): string[] => {
  if (text.trim().endsWith('?')) {
    return [constants.ANSWER_TO_QUESTION];
  }

  const questionWords = getWords(text)
    .map((word) => Az.Morph(word))
    .filter((morphs) => morphs.length && morphs[0].tag.Ques);

  if (questionWords.length) {
    return [constants.ANSWER_TO_QUESTION];
  } else {
    return [];
  }
};
~~~

It returns an array with amusing `constants.ANSWER_TO_QUESTION` if a message is a question, otherwise
returns an empty array.

The **third option** is most interesting, is to reply with vulgar rhyme, like:

>user: хочу в Австрию! (*I want to go to Austria*)  
>bot: хуявстрию (*dickstria*)  
>user: у него есть трактор (*he have a tractor*)  
>bot: хуяктор (*dicktor*)

So how it works, it just replaces first syllable in nouns and adjectives with
"ху" and transformed vowel from the syllable, like "о" → "ё", "а" → "я" and etc.

So, first of all, we need to extract the first syllable it's very easy, we just need all characters
before consonant that after the first vowel:

~~~javascript
const getFirstSyllable = (word: string): string => {
  const result = [];

  let readVowel = false;

  for (const letter of word) {
    const isVowel = constants.VOWELS.indexOf(letter) !== -1;

    if (readVowel && !isVowel) {
      break;
    }

    if (isVowel) {
      readVowel = true;
    }

    result.push(letter);
  }

  return result.join('');
};
~~~

Then we need a function, that will replace the first vowel in a word:
 
~~~javascript
const getRhyme = (word: string): ?string => {
  const morphs = Az.Morph(word);
  if (!morphs.length) {
    return;
  }

  const {tag} = morphs[0];
  if (!tag.NOUN && !tag.ADJF) {
    return;
  }

  const syllable = getFirstSyllable(word);
  if (!syllable || syllable === word) {
    return;
  }

  const prefix = constants.VOWEL_TO_RHYME[last(syllable)];
  const postfix = word.substr(syllable.length);

  return `${prefix}${postfix}`;
};
~~~

And then we need a function that extracts words from a text and returns possible
rhymes:

~~~javascript
const getRhymes = (text: string): string[] =>
  getWords(text)
    .map(getRhyme)
    .filter(Boolean)
    .reverse();
~~~

It's pretty easy, right?

So the **last option** is to reply confused and aggressive when previous options aren't working, like:

>user: wtf  
>bot: Чё? (*What?*)

And it's straightforward and implemented in a function, that aggregate all options:

~~~javascript
export default (text: string): string[] => {
  const answers = uniq([
    ...getByWordTrigger(text),
    ...getAnswerToQuestion(text),
    ...getRhymes(text),
  ]);

  if (answers.length) {
    return answers;
  } else {
    return constants.NO_ANSWERS;
  }
}
~~~

That's all. [Telegram bot](http://t.me/swear_bot), [sources on github](https://github.com/nvbn/telegram-swear-bot/).
