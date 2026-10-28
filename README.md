# Hide It

A small, private app for learning Bible verses by heart. "Thy word have I hid in mine heart" (Psalm 119:11, KJV).

- Add a verse: reference plus pasted text.
- Practise in five steps: full text, first letters, a third blanked, two thirds blanked, then the reference alone. Grade yourself honestly.
- Spaced review: Got it, Nearly or Not yet sets the next date. Home shows only what is due today.
- Child mode: bigger text and friendlier words.

No account, no backend, no analytics, no external requests. Data lives in localStorage on your device. Why it works: see RESEARCH.md.

    npm install && npm run dev
    npm test

## Say it (optional, on-device)

On the recall steps you can tap "Say it" and the app checks your words. Speech is recognised entirely in the browser with [Whisper tiny.en](https://huggingface.co/Xenova/whisper-tiny.en) (OpenAI Whisper, quantised ONNX weights, Apache-2.0 per the model card; Whisper itself is MIT) running on [Transformers.js](https://github.com/huggingface/transformers.js) and ONNX Runtime Web (both Apache-2.0 / MIT). The model (42 MB) and runtime (21 MB) are served from this app, downloaded only when you choose "Download voice model", and cached by the service worker. No audio leaves the device. The result is a suggestion; you still choose the grade.
