(function(tab) {
var tree = { name: "tagName", children: []};
var flat = [];
var nodeCount = 0;
var freqs = [];
var freqsToPlay = [];
var notes = 'ABCDEFG';

function findNearestFrequency(find) {
  var low = 0, high = freqs.length - 1,
      i, comparison;
  while (low <= high) {
    i = Math.floor((low + high) / 2);
    if (freqs[i] < find) { low = i + 1; continue; };
    if (freqs[i] > find) { high = i - 1; continue; };
    return freqs[i];
  }

  if(Math.abs(freqs[high] - find) > Math.abs(freqs[low] - find)) {
    return freqs[low];
  }

  return freqs[i];
};

function generateNameValue(name) {
    var val = 0;
    
    if(name === "BR" || name === "A") return val;

    for(var i = 0; i < name.length; i++) {
        val += name[i].charCodeAt();
    }

    val = findNearestFrequency(val);
        
    freqsToPlay.push(val);
    return val;
}

function randomColor() {
  var rint = Math.round(0xffffff * Math.random());
  return ('#0' + rint.toString(16)).replace(/^#0([0-9a-f]{6})$/i, '#$1');
}

function buildTagTree(rootElement) {
    var treeElement = {};
    treeElement.name = rootElement.tagName;
    treeElement.nameValue = generateNameValue(treeElement.name);
    treeElement.content = rootElement.innerHTML;
    treeElement.addBorder = function() {
      rootElement.style.backgroundColor = randomColor();
      rootElement.style.border = "1px solid" + randomColor();
    };
    treeElement.removeBorder = function() {
      rootElement.style.backgroundColor = "";
      rootElement.style.border = "";
    };
    treeElement.children = [];
    
    for(var i = 0; i < rootElement.childNodes.length; i++) {
        var childNode = rootElement.childNodes[i];

        if(childNode.nodeType === 1) {
            treeElement.children.push(buildTagTree(childNode));
            nodeCount++;
        }
    }

    flat.push(treeElement);
    return treeElement;
}

function makeFrequencies() {
  var title = document.title;
  var root = "C";
  var key = "major";
  
  for(var l = 0; l < title.length; l++) {
    var idx = notes.indexOf(title[l].toUpperCase());
    if (idx != -1) {
      root = notes.charAt(idx);
      break;
    }
  }

  if(document.documentURI.indexOf("https") !== -1) {
    key = "harmonic minor";
  }

  if(document.documentURI.indexOf(".com") === -1) {
    key = "natural minor";
  }

  if(document.documentURI.indexOf(".org") !== -1) {
    key = "minor pentatonic";
  }

  if(document.documentURI.indexOf(".co.") !== -1) {
    key = "major pentatonic";
  }

  for(var o = 1; o <= 8; o++) {
    var n = Note.fromLatin(root + o);
    var scale = n.scale(key);
    for(var i = 0; i < scale.length; i++) {
      freqs.push(scale[i].frequency());
    }
  }
  console.log(freqs);
}

function forEachNode(callback) {
    for(var i = 0; i < flat.length; i++) {
        callback(flat[i]);
    }
}

    makeFrequencies();
    console.log(buildTagTree(document.body));
var tempo = 0;
    var Synth = function(audiolet, nodeInfo) {
      var frequency = nodeInfo.nameValue;
      var children = nodeInfo.children.length || 1;
      AudioletGroup.apply(this, [audiolet, 0, 1]);

      if(nodeInfo.children.length === 0) {
        this.sine = new Sine(this.audiolet, frequency);
      } else {
        this.sine = new Saw(this.audiolet, frequency);
      }

      this.gain = new Gain(this.audiolet);

      this.modulator = new Triangle(this.audiolet, frequency / 2);
      this.modulatorMulAdd = new MulAdd(this.audiolet, frequency * children,
                                        frequency);


      var release = tempo / (8 - nodeInfo.children.length % 8);

      this.envelope = new PercussiveEnvelope(this.audiolet, 1, 0.1, release, 
        function() {
            nodeInfo.removeBorder();
            this.audiolet.scheduler.addRelative(0, this.remove.bind(this));
        }.bind(this));

      this.envMulAdd  = new MulAdd(this.audiolet, 0.5, 0);

      this.filter = new LowPassFilter(this.audiolet, flat.length);

      this.reverb = new Reverb(this.audiolet, 0.33, 0.5, 0.5);

      this.upMixer = new UpMixer(audiolet, 2);


      this.modulator.connect(this.modulatorMulAdd);
      this.modulatorMulAdd.connect(this.sine);
      this.envelope.connect(this.envMulAdd);
      this.envMulAdd.connect(this.gain, 0, 1);
      this.sine.connect(this.reverb);
      this.reverb.connect(this.gain);

      this.gain.connect(this.upMixer);
      this.upMixer.connect(this.outputs[0]);
  };

  var Kick = function(audiolet) {
        AudioletGroup.call(this, audiolet, 0, 1);
        // Main sine oscillator
        this.sine = new Sine(audiolet, 80);

        // Pitch Envelope - from 81 to 1 hz in 0.3 seconds
        this.pitchEnv = new PercussiveEnvelope(audiolet, 1, 0.001, 0.3);
        this.pitchEnvMulAdd = new MulAdd(audiolet, 80, 1);

        // Gain Envelope
        this.gainEnv = new PercussiveEnvelope(audiolet, 1, 0.001, 0.3,
            function() {
                // Remove the group ASAP when env is complete
                this.audiolet.scheduler.addRelative(0,
                                                    this.remove.bind(this));
            }.bind(this)
        );
        this.gainEnvMulAdd = new MulAdd(audiolet, 0.7);
        this.gain = new Gain(audiolet);
        this.upMixer = new UpMixer(audiolet, 2);


        // Connect oscillator
        this.sine.connect(this.gain);

        // Connect pitch envelope
        this.pitchEnv.connect(this.pitchEnvMulAdd);
        this.pitchEnvMulAdd.connect(this.sine);

        // Connect gain envelope
        this.gainEnv.connect(this.gainEnvMulAdd);
        this.gainEnvMulAdd.connect(this.gain, 0, 1);
        this.gain.connect(this.upMixer);
        this.upMixer.connect(this.outputs[0]);
    };
    extend(Kick, AudioletGroup);

    var Hat = function(audiolet) {
        AudioletGroup.call(this, audiolet, 0, 1);
        // Main sine oscillator
        this.sine = new WhiteNoise(this.audiolet);

        // Gain Envelope
        this.gainEnv = new PercussiveEnvelope(audiolet, 1, 0.01, 0.05,
            function() {
                // Remove the group ASAP when env is complete
                this.audiolet.scheduler.addRelative(0,
                                                    this.remove.bind(this));
            }.bind(this)
        );
        this.gainEnvMulAdd = new MulAdd(audiolet, 0.7);
        this.gain = new Gain(audiolet);
        this.filter = new BandPassFilter(audiolet, 3000);
        this.upMixer = new UpMixer(audiolet, 2);



        // Connect oscillator
        this.sine.connect(this.filter);
        this.filter.connect(this.gain);

        // Connect gain envelope
        this.gainEnv.connect(this.gainEnvMulAdd);
        this.gainEnvMulAdd.connect(this.gain, 0, 1);
        this.gain.connect(this.upMixer);
        this.upMixer.connect(this.outputs[0]);
    };
    extend(Hat, AudioletGroup);

  extend(Synth, AudioletGroup);

    var AudioletApp = function() {
        this.audiolet = new Audiolet();

        var that = this;

        var scheduler = this.audiolet.scheduler;
        var audiolet = this.audiolet;
        var beat = 1;
        var beatCount = 0;
        
        var note = 0;
        var mod = 0;
        var extraBeats = !!(flat.length % 2);
        var extraHat = false;
      tempo = flat.length / 3000;
      tempo = 1.5 - tempo * 1.5;
      if (tempo > 2) tempo = 2;
      if (tempo < 0.75) tempo = 0.75;

      console.log(flat.length);

      var chunkSize = Math.floor(flat.length / 3);
      var freqPattern = new PSequence(flat.slice(0, chunkSize));
      var freqPattern2 = new PSequence(flat.slice(chunkSize + 1, chunkSize * 2));
      var freqPattern3 = new PSequence(flat.slice(chunkSize * 2 + 1));

      var beats = [
        new PSequence([tempo, tempo, tempo, tempo / 2, tempo / 2], Infinity),
        new PSequence([tempo / 3, tempo / 3, tempo /3, tempo * 3, tempo * 2, tempo], Infinity),
        new PSequence([tempo * 2], Infinity),
        new PSequence([tempo/2], Infinity),
        new PSequence([tempo/2, tempo/2, tempo, tempo/2, tempo/2, tempo], Infinity),
        new PSequence([tempo], Infinity),
        new PSequence([tempo, tempo, tempo, tempo /2], Infinity),
        new PSequence([tempo /3], Infinity),
        new PSequence([tempo * 3, tempo /3, tempo /3, tempo /3], Infinity),
        new PSequence([tempo], Infinity)
      ];

      var kickBeat = beats[document.title.length % 10];
      var hatBeat = beats[document.documentURI.length % 10];

      scheduler.play([freqPattern], tempo,
        function(info) {
          info.addBorder();
          var synth = new Synth(audiolet, info);
          synth.connect(audiolet.output);
        }.bind(that));

      scheduler.play([freqPattern2], tempo / 2,
        function(info) {
          info.addBorder();
          var synth = new Synth(audiolet, info);
          synth.connect(audiolet.output);
        }.bind(that));

      scheduler.play([freqPattern3], tempo * 2,
        function(info) {
          info.addBorder();
          var synth = new Synth(audiolet, info);
          synth.connect(audiolet.output);
        }.bind(that));

      scheduler.play([], kickBeat,
        function() {
          var kick = new Kick(audiolet);
          kick.connect(audiolet.output);
        }.bind(that));

      scheduler.play([], hatBeat,
        function() {
          var hat = new Hat(audiolet);
          hat.connect(audiolet.output);
        }.bind(that));
    };

    window.audioletApp = new AudioletApp();
})();

