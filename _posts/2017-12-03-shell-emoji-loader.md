---
layout:     post
title:      "Loading/progress indicator for shell with aging emojis"
date:       2017-12-03 18:00:00
keywords:   go, golang, python, shell, emoji
image:      /assets/emoji_loader.png
---

<iframe class="gifify" width="766" height="431" src="https://www.youtube.com/embed/QRb5l8AF2O0?enablejsapi=1&showinfo=0" frameborder="0" allowfullscreen></iframe>
Recently, while waiting for a long-running script to finish, I thought that it would be nice
to have some sort of loader with aging emojis. **TLDR:** [we-are-waiting](https://github.com/nvbn/we-are-waiting).

The "life" of an emoji is simple:

👶🏿 &rarr; 👧🏿 &rarr; 👩🏿 &rarr; 👱🏿‍♀️ &rarr; 👩🏿‍⚕️ &rarr; 👵🏿

It contains aging from a baby to grown-up person, one profession, and oldness.
 
And as we have four colors, two genders, five ages, and 22 professions. We can have a
great variety of lives. So as the first thing to do I decided to generate all those variants.
Initially, I was planning to implement everything in Go, but it's not possible to use
emojis in Go code, only codepoints. Because of that, I decided to write a little Python script,
that will generate Go code with all variants with codepoints instead of emojis.

For that I just copied lines with emojis from [getemoji.com](https://getemoji.com/) and put them in lists:

~~~python
ages = [
    "👶 👦 👧 👨 👩 👱‍♀️ 👱 👴 👵",
    "👶🏻 👦🏻 👧🏻 👨🏻 👩🏻 👱🏻‍♀️ 👱🏻 👴🏻 👵🏻",
    "👶🏼 👦🏼 👧🏼 👨🏼 👩🏼 👱🏼‍♀️ 👱🏼 👴🏼 👵🏼",
    "👶🏽 👦🏽 👧🏽 👨🏽 👩🏽 👱🏽‍♀️ 👱🏽 👴🏽 👵🏽",
    "👶🏾 👦🏾 👧🏾 👨🏾 👩🏾 👱🏾‍♀️ 👱🏾 👴🏾 👵🏾",
    "👶🏿 👦🏿 👧🏿 👨🏿 👩🏿 👱🏿‍♀️ 👱🏿 👴🏿 👵🏿",
]
ages = [x.split(' ') for x in ages]

roles = [
    "👮‍♀️ 👮 👷‍♀️ 👷 💂‍♀️ 💂 🕵️‍♀️ 🕵️ 👩‍⚕️ 👨‍⚕️ 👩‍🌾 👨‍🌾 👩‍🍳 👨‍🍳 👩‍🎓 👨‍🎓 👩‍🎤 👨‍🎤 👩‍🏫 👨‍🏫 👩‍🏭 👨‍🏭 👩‍💻 👨‍💻 👩‍💼 👨‍💼 👩‍🔧 👨‍🔧 👩‍🔬 👨‍🔬 👩‍🎨 👨‍🎨 👩‍🚒 👨‍🚒 👩‍✈️ 👨‍✈️ 👩‍🚀 👨‍🚀 👩‍⚖️ 👨‍⚖️ 🤶 🎅 👸 🤴",
    "👮🏻‍♀️ 👮🏻 👷🏻‍♀️ 👷🏻 💂🏻‍♀️ 💂🏻 🕵🏻‍♀️ 🕵🏻 👩🏻‍⚕️ 👨🏻‍⚕️ 👩🏻‍🌾 👨🏻‍🌾 👩🏻‍🍳 👨🏻‍🍳 👩🏻‍🎓 👨🏻‍🎓 👩🏻‍🎤 👨🏻‍🎤 👩🏻‍🏫 👨🏻‍🏫 👩🏻‍🏭 👨🏻‍🏭 👩🏻‍💻 👨🏻‍💻 👩🏻‍💼 👨🏻‍💼 👩🏻‍🔧 👨🏻‍🔧 👩🏻‍🔬 👨🏻‍🔬 👩🏻‍🎨 👨🏻‍🎨 👩🏻‍🚒 👨🏻‍🚒 👩🏻‍✈️ 👨🏻‍✈️ 👩🏻‍🚀 👨🏻‍🚀 👩🏻‍⚖️ 👨🏻‍⚖️ 🤶🏻 🎅🏻 👸🏻 🤴🏻",
    "👮🏼‍♀️ 👮🏼 👷🏼‍♀️ 👷🏼 💂🏼‍♀️ 💂🏼 🕵🏼‍♀️ 🕵🏼 👩🏼‍⚕️ 👨🏼‍⚕️ 👩🏼‍🌾 👨🏼‍🌾 👩🏼‍🍳 👨🏼‍🍳 👩🏼‍🎓 👨🏼‍🎓 👩🏼‍🎤 👨🏼‍🎤 👩🏼‍🏫 👨🏼‍🏫 👩🏼‍🏭 👨🏼‍🏭 👩🏼‍💻 👨🏼‍💻 👩🏼‍💼 👨🏼‍💼 👩🏼‍🔧 👨🏼‍🔧 👩🏼‍🔬 👨🏼‍🔬 👩🏼‍🎨 👨🏼‍🎨 👩🏼‍🚒 👨🏼‍🚒 👩🏼‍✈️ 👨🏼‍✈️ 👩🏼‍🚀 👨🏼‍🚀 👩🏼‍⚖️ 👨🏼‍⚖️ 🤶🏼 🎅🏼 👸🏼 🤴🏼",
    "👮🏽‍♀️ 👮🏽 👷🏽‍♀️ 👷🏽 💂🏽‍♀️ 💂🏽 🕵🏽‍♀️ 🕵🏽 👩🏽‍⚕️ 👨🏽‍⚕️ 👩🏽‍🌾 👨🏽‍🌾 👩🏽‍🍳 👨🏽‍🍳 👩🏽‍🎓 👨🏽‍🎓 👩🏽‍🎤 👨🏽‍🎤 👩🏽‍🏫 👨🏽‍🏫 👩🏽‍🏭 👨🏽‍🏭 👩🏽‍💻 👨🏽‍💻 👩🏽‍💼 👨🏽‍💼 👩🏽‍🔧 👨🏽‍🔧 👩🏽‍🔬 👨🏽‍🔬 👩🏽‍🎨 👨🏽‍🎨 👩🏽‍🚒 👨🏽‍🚒 👩🏽‍✈️ 👨🏽‍✈️ 👩🏽‍🚀 👨🏽‍🚀 👩🏽‍⚖️ 👨🏽‍⚖️ 🤶🏽 🎅🏽 👸🏽 🤴🏽",
    "👮🏾‍♀️ 👮🏾 👷🏾‍♀️ 👷🏾 💂🏾‍♀️ 💂🏾 🕵🏾‍♀️ 🕵🏾 👩🏾‍⚕️ 👨🏾‍⚕️ 👩🏾‍🌾 👨🏾‍🌾 👩🏾‍🍳 👨🏾‍🍳 👩🏾‍🎓 👨🏾‍🎓 👩🏾‍🎤 👨🏾‍🎤 👩🏾‍🏫 👨🏾‍🏫 👩🏾‍🏭 👨🏾‍🏭 👩🏾‍💻 👨🏾‍💻 👩🏾‍💼 👨🏾‍💼 👩🏾‍🔧 👨🏾‍🔧 👩🏾‍🔬 👨🏾‍🔬 👩🏾‍🎨 👨🏾‍🎨 👩🏾‍🚒 👨🏾‍🚒 👩🏾‍✈️ 👨🏾‍✈️ 👩🏾‍🚀 👨🏾‍🚀 👩🏾‍⚖️ 👨🏾‍⚖️ 🤶🏾 🎅🏾 👸🏾 🤴🏾",
    "👮🏿‍♀️ 👮🏿 👷🏿‍♀️ 👷🏿 💂🏿‍♀️ 💂🏿 🕵🏿‍♀️ 🕵🏿 👩🏿‍⚕️ 👨🏿‍⚕️ 👩🏿‍🌾 👨🏿‍🌾 👩🏿‍🍳 👨🏿‍🍳 👩🏿‍🎓 👨🏿‍🎓 👩🏿‍🎤 👨🏿‍🎤 👩🏿‍🏫 👨🏿‍🏫 👩🏿‍🏭 👨🏿‍🏭 👩🏿‍💻 👨🏿‍💻 👩🏿‍💼 👨🏿‍💼 👩🏿‍🔧 👨🏿‍🔧 👩🏿‍🔬 👨🏿‍🔬 👩🏿‍🎨 👨🏿‍🎨 👩🏿‍🚒 👨🏿‍🚒 👩🏿‍✈️ 👨🏿‍✈️ 👩🏿‍🚀 👨🏿‍🚀 👩🏿‍⚖️ 👨🏿‍⚖️ 🤶🏿 🎅🏿 👸🏿 🤴🏿",
]
roles = [x.split(' ') for x in roles]
~~~

As emojis have a strange order, generation of all variants is a bit tricky, but it's easier than rearranging them
in code because my editor doesn't work quite well with emojis:

~~~python
def get_life(color, gender, role):
    yield ages[color][0]
    yield ages[color][1 + gender]
    yield ages[color][3 + gender]
    yield ages[color][6 - gender]
    yield roles[color][role * 2 + 1 - gender]
    yield ages[color][7 + gender]
~~~
~~~python
>>> list(get_life(0, 0, 0))
['👶', '👦', '👨', '👱', '👮', '👴']
~~~
~~~python
def get_variants():
    for color in range(len(ages)):
        for gender in (0, 1):
            for role in range(len(roles[0]) // 2):
                yield color, gender, role
~~~
~~~python
>>> list(get_life(*list(get_variants())[23]))
['👶', '👧', '👩', '👱\u200d♀️', '👷\u200d♀️', '👵']
~~~

And after that it's very easy to generate Go package with all possible variants:

~~~python
code = b'package variants\n\nvar All = [][]string{\n'

for variant in get_variants():
    code += b'\t{\n'
    for emoji in get_life(*variant):
        code += b'\t\t"' + emoji.encode('unicode-escape') + b'",\n'
    code += b'\t},\n'

code += b'}\n'

with open('variants/variants.go', 'wb') as f:
    f.write(code)
~~~

So we'll have something like this in `variants/variants.go`:

~~~go
package variants

var All = [][]string{
	{
		"\U0001f476",
		"\U0001f466",
		"\U0001f468",
		"\U0001f471",
		"\U0001f46e",
		"\U0001f474",
	},
	...
}
~~~

The logic of the loader isn't that interesting, although I want to highlight some moments. At the high level
we just read lines from a pipe, if there's no new line arrived before `tick` seconds, we update our emojis: 

~~~go
func main() {
        ...
        go watchApp(lines)
        
        for {
            select {
            case line, isOpen := <-lines:
                ...
                os.Stdout.WriteString(line)
                ...
                printPeople(people)
            case <-time.After(time.Duration(*tick) * time.Second):
                people = updatePeople(people, *count)
                printPeople(people)
            }
        }
}
~~~

While updating, we can add new emoji, make one emoji older or "kill" the oldest:

~~~go
func updatePeople(people []*human, count int) []*human {
	addNew := rand.Intn(5) == 0
	toMakeOlder := canMakeOlder(people)

	if addNew || len(toMakeOlder) == 0 {
		people = append(people, getRandomHuman())
	} else {
		index := toMakeOlder[rand.Intn(len(toMakeOlder))]
		people[index].position += 1
	}

	if len(people) > count {
		oldest := getOldest(people)
		return append(people[:oldest], people[oldest+1:]...)
	} else {
		return people
	}
}
~~~

And that's all. You can find the source code on [GitHub](https://github.com/nvbn/we-are-waiting).
