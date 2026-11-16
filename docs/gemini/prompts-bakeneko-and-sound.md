# Gemini で作る素材：化け猫の写真と鳴き声

## A. 化け猫の写真（2枚）

使い方は `prompts.md` と同じ。`reference-normal.png` を添付して、1チャット1枚で作る。
保存名は `bakeneko.png` / `bakeneko-angry.png`。

こわすぎないよう「いたずらっぽい妖怪」に寄せてある。ホラー調にしたいときは `mischievous, slightly spooky but still cute` を `eerie and menacing` に替える。

### 1. 化け猫・ふつう（bakeneko.png）

```
Use the attached photo as the reference. Create a new photorealistic studio photo of the exact same cat transformed into a Japanese bakeneko (yokai cat): same silver tabby pattern and stripes, white chest, white muzzle and white paws, pink nose, same fluffy short fur, same age and body size.

Changes for the bakeneko form: the tail is split into two separate tails (nekomata style), both raised and curling upward behind the body; the eyes glow a soft golden yellow; the fur along the back and tails is slightly bristled; a mischievous, slightly spooky but still cute expression with a faint smirk. Same sitting pose facing the camera as the reference. Show the whole body including both tails.

Square 1:1 image, the cat centered and filling about 80% of the height, plain pure white background, soft even studio lighting, only a faint soft shadow under the cat. No flames, no smoke, no props, no text, no watermark, no border.
```

### 2. 化け猫・おこる（bakeneko-angry.png）

```
Use the attached photo as the reference. Create a new photorealistic studio photo of the exact same cat transformed into a Japanese bakeneko (yokai cat): same silver tabby pattern and stripes, white chest, white muzzle and white paws, pink nose, same fluffy short fur, same age and body size.

Changes for the bakeneko form: the tail is split into two separate tails (nekomata style), both puffed up and raised; the eyes glow a bright golden yellow; the back is arched and the fur stands on end; the cat is hissing with its mouth open showing small fangs, ears flattened sideways. It is sitting or half-standing, facing the camera. Show the whole body including both tails.

Square 1:1 image, the cat centered and filling about 80% of the height, plain pure white background, soft even studio lighting, only a faint soft shadow under the cat. No flames, no smoke, no props, no text, no watermark, no border.
```

### うまくいかないとき

| 症状 | 続けて送る一文 |
| --- | --- |
| しっぽが1本のまま | `Make sure there are exactly two separate tails, clearly visible on both sides behind the body.` |
| 別のねこに見える | `Keep the cat identical to the reference photo: same stripe pattern on the forehead and body, same face shape.` |
| 炎や煙が入る | `Remove all flames, smoke and glow effects around the cat. Only the cat on a plain white background.` |
| こわすぎる | `Make it cuter and less scary, like a mischievous kitten yokai.` |

人魂・紫のもやは写真に入れず、アプリ側で重ねる（切り抜きがきれいになるため）。

## B. 鳴き声（音声）

Gemini の音声生成（Lyria）は音楽用のモデルで、効果音が作れるかは公式には確認できていない。
まず B-1 を試し、音楽になってしまう場合は B-2（動画から音を取り出す）を使う。

ほしい音は4つ。長さや無音の切り詰め、音量そろえはこちらで行うので、だいたいで構わない。

| 保存名 | 内容 | 使う場面 |
| --- | --- | --- |
| `meow1` | 短く甘えた「ニャー」 | なでたとき |
| `meow2` | 少し高めの短い「ニャッ」 | なでたとき（交互に鳴らす） |
| `purr` | ゴロゴロ（2〜3秒） | 続けてなでたとき |
| `hiss` | 低い「シャーッ」 | 化け猫のときになでたとき |

### B-1. 音声として作る

```
Generate a sound effect, not music: a single short meow of a young domestic cat, sweet and friendly, about one second long. Realistic recording quality, close microphone, completely dry with no reverb. No background music, no instruments, no other sounds, silence before and after.
```

ほかの3つは、最初の一文の説明部分だけ差し替える。

- meow2：`a single very short, high-pitched chirpy meow of a young cat ("mew"), about half a second long`
- purr：`a cat purring steadily and contentedly, about three seconds long`
- hiss：`a cat hissing angrily once, low and breathy, about one second long`

### B-2. 動画として作り、音だけ使う

Gemini の動画生成で作り、動画ファイル（mp4）をそのまま渡す。音の取り出しはこちらで行う。

```
A close-up video of a young silver tabby cat sitting on a plain white background, looking at the camera. It meows once, sweetly and clearly, then stays quiet. Realistic natural cat sound, no music, no narration, no other sounds. 4 seconds.
```

- purr：`...It closes its eyes and purrs loudly and steadily the whole time...`
- hiss：`...It suddenly hisses once at the camera with its ears flattened...`

### 受け渡し

- 形式は mp3 / wav / m4a / mp4 のどれでもよい
- 音楽や話し声が混ざったものは使えないので、作り直す
