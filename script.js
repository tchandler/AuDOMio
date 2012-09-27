(function() {
var tree = { name: "tagName", children: []};
var flat = [];
var nodeCount = 0;
var freqs = [];
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
  return freqs[i];
};

function generateNameValue(name) {
    var val = 0;
    for(var i = 0; i < name.length; i++) {
        val += name[i].charCodeAt();
    }
    
    val = findNearestFrequency(val);

    return val;
}

function buildTagTree(rootElement) {
    var treeElement = {};
    treeElement.name = rootElement.tagName;
    treeElement.nameValue = generateNameValue(treeElement.name);
    treeElement.content = rootElement.innerHTML;
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

  for(var o = 0; o <= 8; o++) {
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

    var Synth = function(audiolet, nodeInfo) {
      var frequency = nodeInfo.nameValue;
      console.log(frequency);
      var children = nodeInfo.children.length || 1;
      AudioletGroup.apply(this, [audiolet, 0, 1]);

      if(nodeInfo.children.length === 0) {
        this.sine = new Sine(this.audiolet, frequency);
      } else {
        this.sine = new Saw(this.audiolet, frequency);
      }

      this.modulator = new Triangle(this.audiolet, frequency * 2);
      this.modulatorMulAdd = new MulAdd(this.audiolet, children * 50,
                                        frequency);

      this.gain = new Gain(this.audiolet);

      var release = nodeInfo.children.length / 10;

      this.envelope = new PercussiveEnvelope(this.audiolet, 1, 0.1, children / 10, 
        function() {
            this.audiolet.scheduler.addRelative(0, this.remove.bind(this));
        }.bind(this));

      this.filter = new LowPassFilter(this.audiolet, flat.length);

      this.reverb = new Reverb(this.audiolet, 0.33, 0.5, 0.5);

      this.modulator.connect(this.modulatorMulAdd);
      this.modulatorMulAdd.connect(this.sine);
      this.envelope.connect(this.gain, 0, 1);
      this.reverb.connect(this.gain);
      this.sine.connect(this.reverb);
      this.gain.connect(this.outputs[0]);
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
    }
    extend(Kick, AudioletGroup);

    var Hat = function(audiolet) {
        AudioletGroup.call(this, audiolet, 0, 1);
        // Main sine oscillator
        this.sine = new Saw(audiolet, 160);

        // Gain Envelope
        this.gainEnv = new PercussiveEnvelope(audiolet, 1, 0.001, 0.1,
            function() {
                // Remove the group ASAP when env is complete
                this.audiolet.scheduler.addRelative(0,
                                                    this.remove.bind(this));
            }.bind(this)
        );
        this.gainEnvMulAdd = new MulAdd(audiolet, 0.6);
        this.gain = new Gain(audiolet);
        this.upMixer = new UpMixer(audiolet, 1);


        // Connect oscillator
        this.sine.connect(this.gain);

        // Connect gain envelope
        this.gainEnv.connect(this.gainEnvMulAdd);
        this.gainEnvMulAdd.connect(this.gain, 0, 1);
        this.gain.connect(this.upMixer);
        this.upMixer.connect(this.outputs[0]);
    }
    extend(Hat, AudioletGroup);

  extend(Synth, AudioletGroup);

    var AudioletApp = function() {
        this.audiolet = new Audiolet();

        var that = this;

        var scheduler = this.audiolet.scheduler;
        var audiolet = this.audiolet;
        var beat = 0;
        var beatCount = 0;
        var tempo = 0;
        var note = 0;
        var mod = 0;
        var extraBeats = !!(flat.length % 2);
        var extraHat = false;
        var kickBeat = 1;
        var hatBeat = extraBeats ? 4 : 2;

      tempo = flat.length / 3000;
      tempo = 1.5 - tempo * 1.5;
      if (tempo > 2) tempo = 2;
      if (tempo < 0.75) tempo = 0.75;

      console.log(flat.length);

      forEachNode(function(nodeInfo) {
        beat += tempo;
        beatCount++;

        scheduler.addAbsolute(beat, function() {
            var synth = new Synth(audiolet, nodeInfo);
            synth.connect(audiolet.output);
        }.bind(that));

        if(beatCount % kickBeat === 0) {
          scheduler.addAbsolute(beat + mod, function() {
            var kick = new Kick(audiolet);
            kick.connect(audiolet.output);
          }.bind(that));
        }

        if(beatCount % hatBeat === 0 || extraHat) {
          if(extraBeats) extraHat = !extraHat;
           scheduler.addAbsolute(beat + mod, function() {
            var hat = new Hat(audiolet);
            hat.connect(audiolet.output);
          }.bind(that));
        }

        mod = mod * -1;

      });
    }

    window.audioletApp = new AudioletApp();
})();

