import sys, json, wave, re, tempfile, urllib.request

from vosk import Model, KaldiRecognizer, SetLogLevel

SetLogLevel(-1)

WORD_TO_DIGIT = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "oh": "0", "o": "0",
}

MODEL_PATH = "/opt/proxora/models/vosk-model-small-en-us-0.15"

def transcribe(wav_path):
    model = Model(MODEL_PATH)
    wf = wave.open(wav_path, "rb")
    rec = KaldiRecognizer(model, wf.getframerate())
    results = []
    while True:
        data = wf.readframes(4000)
        if not data:
            break
        if rec.AcceptWaveform(data):
            r = json.loads(rec.Result())
            if r.get("text"):
                results.append(r["text"])
    final = json.loads(rec.FinalResult())
    if final.get("text"):
        results.append(final["text"])
    wf.close()
    return " ".join(results)

def extract_digits(text):
    words = text.lower().split()
    digits = []
    for w in words:
        if w in WORD_TO_DIGIT:
            digits.append(WORD_TO_DIGIT[w])
        elif w.isdigit() and len(w) == 1:
            digits.append(w)
    return "".join(digits)

if __name__ == "__main__":
    url = sys.argv[1]
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp = f.name
    urllib.request.urlretrieve(url, tmp)
    text = transcribe(tmp)
    digits = extract_digits(text)
    print(json.dumps({"text": text, "digits": digits}))
