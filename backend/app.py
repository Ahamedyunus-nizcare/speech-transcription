from flask import Flask, request, jsonify
import os
import torch
import torchaudio
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant
from speechbrain.pretrained import EncoderASR

app = Flask(__name__)

TWILIO_ACCOUNT_SID = "ACf5535d279c2e5bfccdee9ebd19310c55"
TWILIO_API_KEY = "SK4e5958eea1f84f9a104f132ab7d272cay"
TWILIO_API_SECRET = "2yLthy8fsEbcF75il5bMhGZvzOqSvROQ"

# Load ASR model
asr_model = EncoderASR.from_hparams(source="speechbrain/asr-crdnn-rnnlm", savedir="models/asr")

@app.route("/get-token", methods=["GET"])
def get_token():
    token = AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET)
    token.add_grant(VideoGrant())
    return jsonify({"token": token.to_jwt()})

@app.route("/transcribe", methods=["POST"])
def transcribe_audio():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    filepath = os.path.join("uploads", audio_file.filename)
    audio_file.save(filepath)

    waveform, _ = torchaudio.load(filepath)
    transcript = asr_model.transcribe_batch(waveform)

    return jsonify({"text": transcript})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
