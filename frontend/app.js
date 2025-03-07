let localTrack, remoteTrack;
let room;

// Get Twilio Access Token from backend
async function getTwilioToken() {
    let response = await fetch("http://127.0.0.1:5000/get-token");
    let data = await response.json();
    return data.token;
}

// Start Meeting
document.getElementById("startMeeting").addEventListener("click", async () => {
    let token = await getTwilioToken();
    
    Twilio.Video.connect(token, { video: true, audio: true }).then(_room => {
        room = _room;
        console.log("Connected to Room:", room.name);

        // Get local participant audio
        let localParticipant = room.localParticipant;
        localParticipant.tracks.forEach(publication => {
            if (publication.track.kind === "audio") {
                localTrack = publication.track;
                captureAudio(localTrack.mediaStreamTrack, "Local");
            }
        });

        // Get remote participant audio
        room.on("participantConnected", participant => {
            participant.on("trackSubscribed", track => {
                if (track.kind === "audio") {
                    remoteTrack = track;
                    captureAudio(remoteTrack.mediaStreamTrack, "Remote");
                }
            });
        });
    });
});

// Capture Audio and Send to Backend for Transcription
function captureAudio(track, speaker) {
    let audioCtx = new AudioContext();
    let source = audioCtx.createMediaStreamSource(new MediaStream([track]));
    let processor = audioCtx.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioCtx.destination);

    processor.onaudioprocess = event => {
        let audioData = event.inputBuffer.getChannelData(0);
        sendAudioToBackend(audioData, speaker);
    };
}

// Send Audio to Backend
async function sendAudioToBackend(audioData, speaker) {
    let formData = new FormData();
    formData.append("audio", new Blob([audioData]), "audio.wav");
    formData.append("speaker", speaker);

    let response = await fetch("http://127.0.0.1:5000/transcribe", {
        method: "POST",
        body: formData
    });

    let result = await response.json();
    document.getElementById("transcription").innerHTML += `<p><strong>${speaker}:</strong> ${result.text}</p>`;
}

// Leave Meeting
document.getElementById("leaveMeeting").addEventListener("click", () => {
    if (room) {
        room.disconnect();
        console.log("Left the room");
    }
});

// Download Transcript as PDF
document.getElementById("downloadTranscript").addEventListener("click", () => {
    let text = document.getElementById("transcription").innerText;
    let blob = new Blob([text], { type: "application/pdf" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "transcription.pdf";
    link.click();
});
