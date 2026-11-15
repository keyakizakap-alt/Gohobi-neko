# Gemini で作る、ねこの写真（3枚）

## 使い方

1. Gemini（アプリまたは gemini.google.com）で新しいチャットを開く
2. `reference-normal.png` を添付し、下のプロンプトを1つずつ送る（1チャット1枚が安定）
3. 気に入ったものを PNG で保存し、ファイル名を `groom.png` / `sleep.png` / `hungry.png` にする
4. 3枚をこの会話に添付する（切り抜き・組み込みはこちらで行う）

## 共通の条件（どのプロンプトにも含めてある）

- 添付写真と同じねこ（シルバーのキジトラ、白い胸・口元・足先、ピンクの鼻、琥珀色〜緑の目、短めのふわふわの毛）
- 真っ白な無地の背景、正方形、全身が入る、中央、影は薄く、小物・文字・透かしなし
- 写真のような質感（イラスト調にしない）

## 1. 毛づくろい（groom.png）

```
Use the attached photo as the reference. Create a new photorealistic studio photo of the exact same cat: same silver tabby pattern and stripes, white chest, white muzzle and white paws, pink nose, amber-green eyes, same fluffy short fur, same age and body size.

The cat is sitting and grooming itself: it raises one front paw to its mouth and licks it, eyes half-closed, head slightly tilted down. Show the whole body including the tail.

Square 1:1 image, the cat centered and filling about 80% of the height, plain pure white background, soft even studio lighting, only a faint soft shadow under the cat. No props, no bowl, no text, no watermark, no border.
```

## 2. 眠る（sleep.png）

```
Use the attached photo as the reference. Create a new photorealistic studio photo of the exact same cat: same silver tabby pattern and stripes, white chest, white muzzle and white paws, pink nose, same fluffy short fur, same age and body size.

The cat is fast asleep, curled up in a round loaf on the floor, facing the camera, eyes gently closed, chin resting on its front paws, tail wrapped around its body. Peaceful and cozy.

Square 1:1 image, the cat centered with the whole body visible, plain pure white background, soft even studio lighting, only a faint soft shadow under the cat. No cushion, no blanket, no props, no text, no watermark, no border.
```

## 3. おなかぺこぺこ（hungry.png）

```
Use the attached photo as the reference. Create a new photorealistic studio photo of the exact same cat: same silver tabby pattern and stripes, white chest, white muzzle and white paws, pink nose, amber-green eyes, same fluffy short fur, same age and body size.

The cat is sitting facing the camera, looking up with big pleading eyes and a slightly sad, hungry expression, ears a little lowered to the sides. Same sitting pose and framing as the reference photo. Show the whole body including the tail.

Square 1:1 image, the cat centered and filling about 80% of the height, plain pure white background, soft even studio lighting, only a faint soft shadow under the cat. No props, no bowl, no text, no watermark, no border.
```

## うまくいかないときの追加指示

| 症状 | 続けて送る一文 |
| --- | --- |
| 別のねこに見える | `Keep the cat identical to the reference photo: same stripe pattern on the forehead and body, same face shape and eye color.` |
| 背景が白くない・影が濃い | `Make the background pure white (#FFFFFF) with no gradient, and make the shadow very faint.` |
| 体や尻尾が切れている | `Zoom out so the whole body and the tail fit inside the frame with some margin.` |
| イラストっぽい | `Make it look like a real photograph, not an illustration or 3D render.` |
| 小物が入っている | `Remove all props. Only the cat on a plain white background.` |
