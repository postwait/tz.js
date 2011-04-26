if (typeof TZ === "undefined"){ var TZ = { base: 'zoneinfo/', cache: {} }; }

(function (TZ) {
    var file = function (url) {
        var input_data = [];
        var input_pos = 0;

        var getXHR = function() {
            var xhrObj = false;
            try { xhrObj = new XMLHttpRequest(); }
            catch(e) {
                var aTypes = ["Msxml2.XMLHTTP.6.0", "Msxml2.XMLHTTP.3.0", 
                              "Msxml2.XMLHTTP", "Microsoft.XMLHTTP"];
                var len = aTypes.length;
                for ( var i=0; i < len; i++ ) {
                    try { xhrObj = new ActiveXObject(aTypes[i]); }
                    catch(e) { continue; }
                    break;
                }
            }
            finally { return xhrObj; }
        };

        var open = function(url) {
            try {
                var xhr = getXHR();
                xhr.open('GET', url, false);
                xhr.send();
                var info = {};
                eval('info = ' + xhr.responseText); 
                var str = info.data;
                var len = str.length;
                for(var i = 0; i<len; i+=2)
                    input_data.push(parseInt(str.substring(i, i+2), 16));
            }
            catch(e) { }
            return input_data;
        };

        open(url);
        return {
            'SEEK_SET':  0, 'SEEK_CUR': 1, 'SEEK_END': 2,
            'tell': function() { return input_pos; },
            'seek': function(off, whence) {
                var newoff;
                if(whence == 0) newoff = off;
                else if(whence == 1) newoff = input_pos + off;
                else if(whence == 2) newoff = input_data.length + off;
                else throw('illegal whence to seek');
                if(newoff < 0 || newoff > input_data.length) return -1;
                input_pos = newoff;
                return newoff;
            },
            'readByte': function() {
                if(input_pos < 0 || input_pos >= input_data.length) return -1;
                return input_data[input_pos++] & 0xff;
            },
            'readInt': function() {
                var i = 0;
                i |= input_data[input_pos++] & 0xff; i <<= 8;
                i |= input_data[input_pos++] & 0xff; i <<= 8;
                i |= input_data[input_pos++] & 0xff; i <<= 8;
                i |= input_data[input_pos++] & 0xff;
                return i;
            },
            'readString': function(len) {
                var out = '';
                while(len-- > 0)
                    out += String.fromCharCode(input_data[input_pos++]);
                return out;
            }
        };
    };
    var timeZone = function(h) {
        var name = h.name,
            offset = h.offset,
            dst = h.dst;
        return {
            'name': function() { return name; },
            'offset': function() { return offset; },
            'isdst': function() { return dst; }
        };
    };

    var parse_zoneinfo = function(zonename) {
        var zi = { };
        var o = {
            'name': function() { return zi.normaltz.name(); },
            'getTZ': function(w) {
                // find the dst 'before' our whence (binary search)
                var l = 1, r = zi.trans_times.length;
                if(r == 0) return zi.tz[0];
                var i = Math.round((l + r)/2);
                while(i > l) {
                    if(l >= zi.trans_times.length) {
                        i = zi.trans_times.length;
                        break;
                    }
                    if(l == i) break;
                    if(zi.trans_times[i] == w) { i++; break; }
                    else if(zi.trans_times[i] > w) r = i-1;
                    else l = i+1;
                    i = Math.round((l + r)/2);
                }
                if(w > zi.trans_times[i]) i++;
                return zi.tz[zi.trans_types[i - 1]];
            }
        };
        var url = TZ.base + zonename + '.json';
        var f = file(url);
        // skip the header
        if(f.seek(28, f.SEEK_SET) != 28) return null;
        zi.leapcnt = f.readInt();
        zi.timecnt = f.readInt();
        zi.typecnt = f.readInt();
        zi.charcnt = f.readInt();

        /* This is all daylight savings time transition information */
        zi.trans_times = new Array(zi.timecnt);
        for (var i = 0; i < zi.timecnt; ++i)
  	    zi.trans_times[i] = f.readInt();
        zi.trans_types = new Array(zi.timecnt);
        for (var i = 0; i < zi.timecnt; ++i)
  	    zi.trans_types[i] = f.readByte();

        /* This is the timezone type data */
        zi.tz = new Array(zi.typecnt);
        for (var i = 0; i < zi.typecnt; ++i) {
            zi.tz[i] = {};
            zi.tz[i].offset = f.readInt();
            zi.tz[i].dst = f.readByte();
            zi.tz[i].idx = f.readByte();
        }
        var str = f.readString(zi.charcnt);
        for (var i = 0; i < zi.typecnt; ++i) {
            var pos = zi.tz[i].idx;
            var end = pos;
            while(end < zi.charcnt && str.charCodeAt(end) != 0) ++end;
            zi.tz[i].name = str.substring(pos, end);
            zi.tz[i] = timeZone(zi.tz[i]);
        }

        // this is the leap second information
        zi.leap_secs = new Array(zi.leapcnt *2);
        var leapcnt = zi.leapcnt;
        for (var i = 0; leapcnt > 0; --leapcnt) {
	    zi.leap_secs[i++] = f.readInt();
	    zi.leap_secs[i++] = f.readInt();
        }

        // normal timezone is the first non-daylight savings zone
        var n = 0;
        while (zi.tz[n].isdst() && n < zi.tz.length)
            ++n;
        zi.normaltz = zi.tz[n];
        var ts = (new Date()).getTime() / 1000;
        for (var i = 0; i < 9; i++) {
            // walk in 3 month increments
            var tz = o.getTZ(ts + 7776000*i);
            if (!tz.isdst()) {
	        tz.normaltz = tz;
	        break;
            }
        }
        TZ.cache[zonename] = o;
        return o;
    };

    var load = function(zonename) {
        if (TZ.cache[zonename]) return TZ.cache[zonename];
        return parse_zoneinfo(zonename);
    }
    var date = function(zonename) {
        var zi = load(zonename), tz,
            utc, hack, crack, zoff, sign;
        var ms_whence = arguments[1];
        var args = ([]).slice.call(arguments);
        if(ms_whence == null) ms_whence = (new Date()).getTime();
        if(zi == null) return new Date(args.splice(1));

        if(arguments.length > 2) {
          // extended date form
          var year = arguments[1];
              month = (arguments.length > 2) ? arguments[2] : 1,
              day = (arguments.length > 3) ? arguments[3] : 1,
              hours = (arguments.length > 4) ? arguments[4] : 0,
              minutes = (arguments.length > 5) ? arguments[5] : 0,
              seconds = (arguments.length > 6) ? arguments[6] : 0,
              milliseconds = (arguments.length > 7) ? arguments[7] : 0;
          ms_whence = Date.UTC(year,month,day,hours,minutes,seconds,milliseconds);
          var tz1 = zi.getTZ(ms_whence/1000);
          ms_whence -= tz1.offset()*1000;
        }

        function update(new_whence) {
          tz = zi.getTZ(new_whence/1000);
          utc = new Date(new_whence);
          hack = new Date(new_whence + tz.offset()*1000);
          crack = new Date(hack.getUTCFullYear(),
                           hack.getUTCMonth(),
                           hack.getUTCDate(),
                           hack.getUTCHours(),
                           hack.getUTCMinutes(),
                           hack.getUTCSeconds(),
                           hack.getUTCMilliseconds());
          zoff = Math.floor(tz.offset() / 60);
          sign = zoff < 0 ? '-' : '+';
          zoff = (Math.floor(Math.abs(zoff/60)) * 100 + (Math.abs(zoff) % 60));
        }
        function newlocal(year,month,day,hours,minutes,seconds,ms) {
          year = (typeof(year)==="undefined" || year == null) ?
                   hack.getUTCFullYear() : year;
          month = (typeof(month)==="undefined" || month == null) ?
                    hack.getUTCMonth() : month;
          day = (typeof(day)==="undefined" || day == null) ?
                  hack.getUTCDate() : day;
          hours = (typeof(hours)==="undefined" || hours == null) ?
                    hack.getUTCHours() : hours;
          minutes = (typeof(minutes)==="undefined" || minutes == null) ?
                      hack.getUTCMinutes() : minutes;
          seconds = (typeof(seconds)==="undefined" || seconds == null) ?
                      hack.getUTCSeconds() : seconds;
          ms = (typeof(ms)==="undefined" || ms == null) ?
                           hack.getUTCMilliseconds() : ms;
          var whence = Date.UTC(year,month,day,hours,minutes,seconds,ms);
          var tz1 = zi.getTZ(whence/1000);
          whence -= tz1.offset()*1000;
          update(whence);
          return utc.getTime();
        }

        update(ms_whence);
        var fix = function(str) {
            var repl = sign;
            if(Math.abs(zoff) < 1000) repl = repl + '0';
            repl = repl + zoff.toString(10);
            str = str.replace(/GMT[-+]\d{4}/, "GMT" + repl)
                     .replace(/\(.+\)$/, "(" + tz.name() + ")");
            return str;
        }
        return {
            'getTime': function() { return utc.getTime(); },
            'setTime': function(o) { return update(o); },
            'getTimezoneOffset': function() { return tz.offset / -60; },
            'getDate': function() { return hack.getUTCDate(); },
            'getDay': function() { return hack.getUTCDay(); },
            'getMonth': function() { return hack.getUTCMonth(); },
            'getFullYear': function() { return hack.getUTCFullYear(); },
            'getYear': function() { return hack.getUTCFullYear(); },
            'getHours': function() { return hack.getUTCHours(); },
            'getMilliseconds': function() { return hack.getUTCMilliseconds(); },
            'getMinutes': function() { return hack.getUTCMinutes(); },
            'getSeconds': function() { return hack.getUTCSeconds(); },

            'setFullYear': function(o)
              { return newlocal(o); },
            'setMonth': function(o)
              { return newlocal(null, o); },
            'setDate': function(o)
              { return newlocal(null, null, o); },
            'setHours': function(o)
              { return newlocal(null, null, null, o); },
            'setMinutes': function(o)
              { return newlocal(null, null, null, null, o); },
            'setSeconds': function(o)
              { return newlocal(null, null, null, null, null, o); },
            'setMilliseconds': function(o)
              { return newlocal(null, null, null, null, null, null, o); },

            'getUTCDate': function() { return utc.getUTCDate(); },
            'getUTCDay': function() { return utc.getUTCDay(); },
            'getUTCMonth': function() { return utc.getUTCMonth(); },
            'getUTCFullYear': function() { return utc.getUTCFullYear(); },
            'getUTCYear': function() { return utc.getUTCFullYear(); },
            'getUTCHours': function() { return utc.getUTCHours(); },
            'getUTCMilliseconds': function() { return utc.getUTCMilliseconds(); },
            'getUTCMinutes': function() { return utc.getUTCMinutes(); },
            'getUTCSeconds': function() { return utc.getUTCSeconds(); },

            'setUTCDate': function(o)
              { update(utc.setUTCDate(o)); return utc.getTime(); },
            'setUTCMonth': function(o)
              { update(utc.setUTCMonth(o)); return utc.getTime(); },
            'setUTCFullYear': function(o)
              { update(utc.setUTCFullYear(o)); return utc.getTime(); },
            'setUTCYear': function(o)
              { update(utc.setUTCYear(o)); return utc.getTime(); },
            'setUTCHours': function(o)
              { update(utc.setUTCHours(o)); return utc.getTime(); },
            'setUTCMilliseconds': function(o)
              { update(utc.setUTCMilliseconds(o)); return utc.getTime(); },
            'setUTCMinutes': function(o)
              { update(utc.setUTCMinutes(o)); return utc.getTime(); },
            'setUTCSeconds': function(o)
              { update(utc.setUTCSeconds(o)); return utc.getTime(); },

            'toUTCString': function() { return fixup(utc.toUTCString()); },
            // These are the annoying ones as there's no way to get at
            // the internal locale's format for dates...
            'toDateString': function() { return fix(crack.toDateString()); },
            'toLocaleDateString': function() { return fix(crack.toLocaleDateString()); },
            'toLocaleTimeString': function() { return fix(crack.toLocaleTimeString()); },
            'toLocaleString': function() { return fix(crack.toLocaleString()); },
            'toString': function() { return fix(crack.toString()); },
            'toTimeString': function() { return fix(crack.toTimeString()); }
        };
    }

    TZ.load = load;
    TZ.date = date;
})(TZ);
