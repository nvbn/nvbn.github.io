---
layout:     post
title:      "Video from subtitles or Bob's Burgers to The Simpsons with TensorFlow"
date:       2018-08-30 00:40:00
keywords:   python, tensorflow, nlp, subtitles
image:      /assets/bobs_burgers_to_simpsons.jpg
---

![Bob's Burgers to The Simpsons](/assets/bobs_burgers_to_simpsons.jpg)

Back in June I've [played a bit with subtitles and tried to generate a filmstrip](/2018/06/19/stock-film-strip/),
it wasn't that much successful, but it was fun. So I decided to try to go deeper and generate a video from
subtitles. The main idea is to get phrases from a part of some vide, get the most similar phrases from
another video and generate something.

As the "enemy" I've decided to use [a part from Bob's Burgers Tina-rannosaurus Wrecks episode](https://www.youtube.com/watch?v=hZ_EKHGgWJQ):
<iframe width="766" height="490" src="https://www.youtube.com/embed/hZ_EKHGgWJQ?enablejsapi=1&showinfo=0" frameborder="0" allowfullscreen></iframe>

As the source, I've decided to use The Simpsons, as they have a lot of episodes and *Simpsons Already Did It* whatever.
I somehow have 671 episode and managed to get perfectly matching subtitles for 452 of them.

**TLDR:** It was fun, but the result is meh at best:
<iframe width="766" height="490" src="https://www.youtube.com/embed/fBdfVw2oT7I?enablejsapi=1&showinfo=0" frameborder="0" allowfullscreen></iframe>

Initially, I was planning to use Friends and Seinfeld but the result was even worse.

As the first step I've parsed subtitles (boring, available in [the gist](https://gist.github.com/nvbn/f1365d2548f48fad449bb66d650ad95f)) and created a mapping from phrases and
"captions" (subtitles parts with timing and additional data) and a list of phrases from all available subtitles:

~~~python
data_text2captions = defaultdict(lambda: [])
for season in root.glob('*'):
    if season.is_dir():
        for subtitles in season.glob('*.srt'):
            for caption in read_subtitles(subtitles.as_posix()):
                data_text2captions[caption.text].append(caption)

data_texts = [*data_text2captions]
~~~
~~~python
>>> data_text2captions["That's just a dog in a spacesuit!"]
[Caption(path='The Simpsons S13E06 She of Little Faith.srt', start=127795000, length=2544000, text="That's just a dog in a spacesuit!")]
>>> data_texts[0]
'Give up, Mr. Simpson! We know you have the Olympic torch!'
~~~

After that I've *found* subtitles for the Bob's Burgers episode and manually selected parts from the part of the episode that
I've used as the "enemy" and processed them in a similar way:

~~~python
play = [*read_subtitles('Bobs.Burgers.S03E07.HDTV.XviD-AFG.srt')][1:54]
play_text2captions = defaultdict(lambda: [])
for caption in play:
    play_text2captions[caption.text].append(caption)

play_texts = [*play_text2captions]
~~~
~~~python
>>> play_text2captions[ 'Who raised you?']
[Caption(path='Bobs.Burgers.S03E07.HDTV.XviD-AFG.srt', start=118605000, length=1202000, text='Who raised you?')]
>>> play_texts[0]
"Wow, still can't believe this sale."
~~~

Then I've generated vectors for all phrases with
[TensorFlow's The Universal Sentence Encoder](https://www.tensorflow.org/hub/modules/google/universal-sentence-encoder/2)
and used cosine similarity to get most similar phrases:

~~~python
module_url = "https://tfhub.dev/google/universal-sentence-encoder/2"
embed = hub.Module(module_url)

vec_a = tf.placeholder(tf.float32, shape=None)
vec_b = tf.placeholder(tf.float32, shape=None)

normalized_a = tf.nn.l2_normalize(vec_a, axis=1)
normalized_b = tf.nn.l2_normalize(vec_b, axis=1)
sim_scores = -tf.acos(tf.reduce_sum(tf.multiply(normalized_a, normalized_b), axis=1))


def get_similarity_score(text_vec_a, text_vec_b):
    emba, embb, scores = session.run(
        [normalized_a, normalized_b, sim_scores],
        feed_dict={
            vec_a: text_vec_a,
            vec_b: text_vec_b
        })
    return scores


def get_most_similar_text(vec_a, data_vectors):
    scores = get_similarity_score([vec_a] * len(data_texts), data_vectors)
    return data_texts[sorted(enumerate(scores), key=lambda score: -score[1])[3][0]]


with tf.Session() as session:
    session.run([tf.global_variables_initializer(), tf.tables_initializer()])
    data_vecs, play_vecs = session.run([embed(data_texts), embed(play_texts)])
    data_vecs = np.array(data_vecs).tolist()
    play_vecs = np.array(play_vecs).tolist()

    similar_texts = {play_text: get_most_similar_text(play_vecs[n], data_vecs)
                     for n, play_text in enumerate(play_texts)}
~~~
~~~python
>> similar_texts['Is that legal?']
"- [Gasping] - Uh, isn't that illegal?"
>>> similar_texts['(chuckling): Okay, okay.']
'[ Laughing Continues ] All right. Okay.
~~~

Looks kind of relevant, right? Unfortunately only phrase by phrase.

After that, I've cut parts of The Simpsons episodes for matching phrases. This part was a bit complicated,
because without a force re-encoding (with the same encoding) and setting a framerate
(with kind of the same framerate with most of the videos)
it was producing unplayable videos:

~~~python
def generate_parts():
    for n, caption in enumerate(play):
        similar = similar_texts[caption.text]
        similar_caption = sorted(
            data_text2captions[similar],
            key=lambda maybe_similar: abs(caption.length - maybe_similar.length),
            reverse=True)[0]

        yield Part(
            video=similar_caption.path.replace('.srt', '.mp4'),
            start=str(timedelta(microseconds=similar_caption.start))[:-3],
            end=str(timedelta(microseconds=similar_caption.length))[:-3],
            output=Path(output_dir).joinpath(f'part_{n}.mp4').as_posix())


parts = [*generate_parts()]
for part in parts:
    call(['ffmpeg', '-y', '-i', part.video,
          '-ss', part.start, '-t', part.end,
          '-c:v', 'libx264', '-c:a', 'aac', '-strict', 'experimental',
          '-vf', 'fps=30',
          '-b:a', '128k', part.output])
~~~
~~~python
>>> parts[0]
Part(video='The Simpsons S09E22 Trash of the Titans.mp4', start='0:00:31.531', end='0:00:03.003', output='part_0.mp4')
~~~

And at the end I've generated a special file for the FFmpeg concat and concatenated the generated parts (also with *re-encoding*):

~~~python
concat = '\n'.join(f"file '{part.output}'" for part in parts) + '\n'
with open('concat.txt', 'w') as f:
    f.write(concat)
~~~
~~~bash
➜ cat concat.txt | head -n 5
file 'parts/part_0.mp4'
file 'parts/part_1.mp4'
file 'parts/part_2.mp4'
file 'parts/part_3.mp4'
file 'parts/part_4.mp4'
~~~
~~~python
call(['ffmpeg', '-y', '-safe', '0', '-f', 'concat', '-i', 'concat.txt',
      '-c:v', 'libx264', '-c:a', 'aac', '-strict', 'experimental',
      '-vf', 'fps=30', 'output.mp4'])
~~~

As the result is kind of meh, but it was fun, I'm going to try to do that again with a bigger dataset,
even working with FFmpeg wasn't fun at all.

[Gist with full sources](https://gist.github.com/nvbn/f1365d2548f48fad449bb66d650ad95f).
