import { useEffect, useRef, useState } from "react";

const noteMap = new Map();

const WAVEFORMS = ["square", "triangle", "sawtooth", "sine"];
const STAGE_MAX_TIME = 2;

function HomePage() {
  const midi = useRef(null);
  const actx = useRef(null);
  const mainGain = useRef(null);
  const adsrNode = useRef(null);
  const compressorNode = useRef(null);
  const [volume, setVolume] = useState(0.5);
  const [waveform, setWaveform] = useState(0);
  const [attack, setAttack] = useState(0.0);
  const [decay, setdecay] = useState(0.0);
  const [sustain, setSustain] = useState(1.0);
  const [release, setRelease] = useState(0.0);
  const waveformString = useRef(WAVEFORMS[waveform]);
  function onMIDIMessage(message) {
    const data = message.data;
    const type = data[0] & 0xf0;
    const note = data[1];
    const velocity = data[2];
    switch (type) {
      case 144:
        noteOn(note, velocity);
        break;
      case 128:
        noteOff(note);
        break;
    }
  }
  function noteOn(note, velocity) {
    // Adapted from Neil McCallion's video: https://www.youtube.com/watch?v=uasGsHf7UYA
    adsrNode.current.gain.cancelScheduledValues(actx.current.currentTime);

    const osc = actx.current.createOscillator();
    osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
    osc.waveform = waveformString.current;
    osc.connect(adsrNode.current);
    osc.start();
    noteMap.set(note, osc);

    const attackDuration = attack * STAGE_MAX_TIME;
    const attackEndTime = actx.current.currentTime + attackDuration;
    const decayDuration = decay * STAGE_MAX_TIME;

    adsrNode.current.gain.setValueAtTime(0, actx.current.currentTime);
    adsrNode.current.gain.linearRampToValueAtTime(1, attackEndTime);
    adsrNode.current.gain.setTargetAtTime(
      sustain,
      attackEndTime,
      decayDuration
    );
  }
  function handleNoteOn(note) {
    return () => noteOn(note, 127);
  }
  function noteOff(note) {
    adsrNode.current.gain.cancelScheduledValues(actx.current.currentTime);

    const now = actx.current.currentTime;
    const releaseDuration = release * STAGE_MAX_TIME;
    const releaseEndTime = now + releaseDuration;
    adsrNode.current.gain.setValueAtTime(adsrNode.current.gain.value, now);
    adsrNode.current.gain.linearRampToValueAtTime(0.1, releaseEndTime);
    noteMap.get(note)?.stop(releaseEndTime);
  }
  function handleNoteOff(note) {
    return () => noteOff(note);
  }

  useEffect(() => {
    if (mainGain.current) {
      mainGain.current.gain.value = volume;
    }
  }, [volume]);
  useEffect(() => {
    waveformString.current = WAVEFORMS[waveform];
  }, [waveform]);
  useEffect(() => {
    // Get AudioContext() on Window, if available
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      throw new Error("WebAudio not supported");
    }

    // Create a new AudioContext
    actx.current = new AudioContext();
    mainGain.current = actx.current.createGain();
    mainGain.current.connect(actx.current.destination);
    compressorNode.current = actx.current.createDynamicsCompressor();
    compressorNode.current.connect(mainGain.current);
    adsrNode.current = actx.current.createGain();
    adsrNode.current.connect(compressorNode.current);

    // Get MIDI access
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(
        (midiAccess) => {
          midi.current = midiAccess;

          const inputs = midi.current.inputs.values();
          // Loop over all available inputs and listen for any MIDI input
          for (
            let input = inputs.next();
            input && !input.done;
            input = inputs.next()
          ) {
            input.value.onmidimessage = onMIDIMessage;
          }
        },
        () => console.warn("Could not access your MIDI devices.")
      );
    } else {
      console.warn("The browser does not support WebMIDI!");
    }
  }, []);

  useEffect(() => {
    console.log(attack, decay, sustain, release);
  }, [attack, decay, sustain, release]);

  return (
    <div className="2xl:w-8/12 mx-auto 2xl:mt-20 2xl:rounded-2xl overflow-hidden">
      <div className="w-full h-64 bg-sky-900 p-8 flex items-center justify-between gap-4">
        <div className="w-1/12 h-full bg-sky-800 flex flex-col rounded-sm">
          <div className="flex justify-center text-mono text-amber-400">
            OSC
          </div>
          <div className="flex flex-col h-full">
            <div
              onClick={() => setWaveform(0)}
              className={`font-mono text-slate-50 ${
                waveform === 0 ? "bg-sky-600" : "bg-sky-900"
              } h-full m-1 mb-0 flex justify-center items-center`}
            >
              SQR
            </div>
            <div
              onClick={() => setWaveform(1)}
              className={`font-mono text-slate-50 ${
                waveform === 1 ? "bg-sky-600" : "bg-sky-900"
              } h-full m-1 mb-0 flex justify-center items-center`}
            >
              TRI
            </div>
            <div
              onClick={() => setWaveform(2)}
              className={`font-mono text-slate-50 ${
                waveform === 2 ? "bg-sky-600" : "bg-sky-900"
              } h-full m-1 mb-0 flex justify-center items-center`}
            >
              SAW
            </div>
            <div
              onClick={() => setWaveform(3)}
              className={`font-mono text-slate-50 ${
                waveform === 3 ? "bg-sky-600" : "bg-sky-900"
              } h-full m-1 flex justify-center items-center`}
            >
              SINE
            </div>
          </div>
        </div>
        <Eye />
        <div className="w-3/12 h-full bg-sky-800 flex flex-col rounded-sm">
          <div className="flex justify-center text-mono text-amber-400">
            ADSR
          </div>
          <div className="flex w-full h-full">
            <div className="flex flex-col h-full w-1/2">
              <div className="font-mono text-slate-50 h-full m-1 mb-0 flex justify-center items-center">
                ATTACK
              </div>
              <div className="font-mono text-slate-50 h-full m-1 mb-0 flex justify-center items-center">
                DECAY
              </div>
              <div className="font-mono text-slate-50 h-full m-1 mb-0 flex justify-center items-center">
                SUSTAIN
              </div>
              <div className="font-mono text-slate-50 h-full m-1 flex justify-center items-center">
                RELEASE
              </div>
            </div>
            <div className="flex flex-col w-full h-full">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                defaultValue="0"
                onChange={(e) => setAttack(e.target.value)}
                className="font-mono text-slate-50 accent-amber-500 h-full m-1 mb-0 flex justify-center items-center"
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                defaultValue="0"
                onChange={(e) => setdecay(e.target.value)}
                className="font-mono text-slate-50 accent-amber-500 h-full m-1 mb-0 flex justify-center items-center"
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                defaultValue="1"
                onChange={(e) => setSustain(e.target.value)}
                className="font-mono text-slate-50 accent-amber-500 h-full m-1 mb-0 flex justify-center items-center"
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                defaultValue="0"
                onChange={(e) => setRelease(e.target.value)}
                className="font-mono text-slate-50 accent-amber-500 h-full m-1 flex justify-center items-center"
              />
            </div>
          </div>
        </div>
        <div className="w-4/12 h-full bg-sky-800 flex flex-col rounded-sm"></div>
        <Eye />
        <div className="w-1/12 h-full bg-sky-800 flex flex-col rounded-sm">
          <div className="flex justify-center text-mono text-amber-400">
            MASTER
          </div>
          <div className="flex flex-col h-full">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              defaultValue="0.5"
              onChange={(e) => setVolume(e.target.value)}
              className="font-mono text-slate-50 accent-amber-500 h-full flex justify-center items-center -rotate-90"
            />
          </div>
        </div>
      </div>
      <div className="flex h-64 w-full select-none justify-center bg-sky-600 pb-8">
        <Octave
          octave={4}
          handleNoteOn={handleNoteOn}
          handleNoteOff={handleNoteOff}
        />
        <Octave
          octave={5}
          handleNoteOn={handleNoteOn}
          handleNoteOff={handleNoteOff}
        />
      </div>
    </div>
  );
}

function Eye() {
  return (
    <div className="w-1/12 h-full bg-slate-900 flex flex-col rounded-xl rounded-t-3xl p-2">
      <div className="w-full h-full ring-8 ring-amber-900 rounded-sm rounded-t-xl flex items-end pb-10 justify-center">
        <span className="bg-slate-50 w-8 h-12 rounded-lg rounded-t-2xl"></span>
      </div>
    </div>
  );
}

function Octave({ octave, handleNoteOn, handleNoteOff }) {
  const start = 12 * (octave + 1);
  return (
    <>
      <WhiteKey
        display={`C${octave}`}
        noteOn={handleNoteOn(start)}
        noteOff={handleNoteOff(start)}
      />
      <BlackKey
        display={`C#${octave}`}
        noteOn={handleNoteOn(start + 1)}
        noteOff={handleNoteOff(start + 1)}
      />
      <WhiteKey
        display={`D${octave}`}
        noteOn={handleNoteOn(start + 2)}
        noteOff={handleNoteOff(start + 2)}
      />
      <BlackKey
        display={`D#${octave}`}
        noteOn={handleNoteOn(start + 3)}
        noteOff={handleNoteOff(start + 3)}
      />
      <WhiteKey
        display={`E${octave}`}
        noteOn={handleNoteOn(start + 4)}
        noteOff={handleNoteOff(start + 4)}
      />
      <WhiteKey
        display={`F${octave}`}
        noteOn={handleNoteOn(start + 5)}
        noteOff={handleNoteOff(start + 5)}
      />
      <BlackKey
        display={`F#${octave}`}
        noteOn={handleNoteOn(start + 6)}
        noteOff={handleNoteOff(start + 6)}
      />
      <WhiteKey
        display={`G${octave}`}
        noteOn={handleNoteOn(start + 7)}
        noteOff={handleNoteOff(start + 7)}
      />
      <BlackKey
        display={`G#${octave}`}
        noteOn={handleNoteOn(start + 8)}
        noteOff={handleNoteOff(start + 8)}
      />
      <WhiteKey
        display={`A${octave + 1}`}
        noteOn={handleNoteOn(start + 9)}
        noteOff={handleNoteOff(start + 9)}
      />
      <BlackKey
        display={`A#${octave + 1}`}
        noteOn={handleNoteOn(start + 10)}
        noteOff={handleNoteOff(start + 10)}
      />
      <WhiteKey
        display={`B${octave + 1}`}
        noteOn={handleNoteOn(start + 11)}
        noteOff={handleNoteOff(start + 11)}
      />
    </>
  );
}

export default HomePage;
function BlackKey({ display, noteOn, noteOff }) {
  return (
    <div
      className="z-0 -mx-4 flex h-[80%] w-8 flex-col-reverse items-center border-[1px] border-slate-600 bg-slate-800 text-slate-50 hover:bg-slate-700"
      onMouseDown={() => noteOn()}
      onMouseUp={() => noteOff()}
    >
      <span>{display}</span>
    </div>
  );
}

function WhiteKey({ display, noteOn, noteOff }) {
  return (
    <div
      className="flex h-full w-12 flex-col-reverse items-center border-[1px] border-slate-200 bg-slate-50 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700"
      onMouseDown={() => noteOn()}
      onMouseUp={() => noteOff()}
    >
      <span>{display}</span>
    </div>
  );
}
