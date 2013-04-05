AuDOMio
=======

Dynamically generates music by parsing the structure of web sites.  Audio generation done using [Audiolet.js](https://github.com/oampo/Audiolet) and [Music.js](https://github.com/gregjopa/music.js).

During playback, whichever nodes are being used to create a sound are given a random background and border color.

---

Originally developed as a Chrome extension.  Now can be loaded as a bookmarklet by referencing build.js.

[AuDOMio Bookmarklet](javascript:javascript:(function(\){document.body.appendChild(document.createElement('script'\)\).src='https://raw.github.com/tchandler/AuDOMio/master/build.js';}\)(\);) - This will load build.js and begin playing the page.

[AuDOMio Stop Bookmarklet](javascript:(function(\){audioletApp.audiolet.output=null;}\)(\);) - This will stop playback.