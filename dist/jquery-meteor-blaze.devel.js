(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(jQuery, underscore) {
	//Create a new meteor cient andd append it to the jQuery object
	jQuery.Meteor = require("meteor-client")(jQuery, underscore);

	/**
	 * Compile the spacebars template and generate the JS renderer functions for each one
	 * @method spacebars
	 * @return {object} renderer functions
	 */
	jQuery.fn.spacebars = function() {
		//Renderer functions
		var renderers = {}
		this.each(function(index, obj) {
			//Get template name
			var name = obj.getAttribute('name');
			//Create references that will be called in the renderer function
			var HTML = jQuery.Meteor.HTML;
			var Blaze = jQuery.Meteor.Blaze;
			var Spacebars = jQuery.Meteor.Spacebars;
			//Compile JS
			var render = eval(jQuery.Meteor.SpacebarsCompiler.compile(obj.innerHTML, {
				isTemplate: true
			}));
			//Add renderer function for template
			renderers[name] = render;
		});
		//Return all the renderer functionas
		return renderers;
	};

	/**
	 * Instantiates a blaze template instance
	 * @method blaze
	 * @param {function} renderer - renderer function for the template
	 */
	jQuery.fn.blaze = function(renderer) {
		return this.each(function(index, obj) {
			//Check if the template has been created already
			if (obj.instance)
				//Error
				throw new Error("Template already instantiated for " + obj);
			//Create template instance
			obj.instance = new jQuery.Meteor.Blaze.Template(obj.id, renderer);
			//Set created callback
			obj.instance.onCreated(function() {
				//Triger event
				jQuery(obj).trigger('create',obj.instance);
			});
			//Set rendered callback
			obj.instance.onRendered(function() {
				//Triger event
				jQuery(obj).trigger('render',obj.instance);
			});
			//Set destroyed callback
			obj.instance.onDestroyed(function() {
				//Triger event
				jQuery(obj).trigger('destroy',obj.instance);
				//Clean instance from object
				delete obj.instance;
			});
		});
	};

	/**
	 * Terminate a blaze template instance withou removing the DOM object
	 * @method blaze
	 * @param {function} renderer - renderer function for the template
	 */
	jQuery.fn.unblaze = function() {
		return this.each(function(index, obj) {
			//Check if the template has been rendered already
			if (obj.instance && obj.instance.view)
				//Erase it
				jQuery.Meteor.Blaze.remove(obj.instance.view);
			//Clean instance from object
			delete obj.instance;
		});
	};

	/**
	 * Render an instantiated template view
	 * @method render
	 * @param {object} [data] - data object to render templete with
	 * @param {object} [after] - child node to insert the template after
	 */
	jQuery.fn.render = function(data, after) {
		return this.each(function(index, obj) {
			//Check that the template has been created already
			if (!obj.instance)
				//Error
				throw new Error("Template not instantiated for " + obj);
			//Render temmplate instance
			obj.instance.view = jQuery.Meteor.Blaze.renderWithData(obj.instance, jQuery.extend({}, jQuery(obj) .data(), data), obj, after);
		});
	};

	/**
	 * Add a function helper to an instantiated template
	 * @method helpers
	 * @param {string} key - helper name
	 * @param {object|function} value - helper
	 */
	jQuery.fn.helpers = function(key, val) {
		return this.each(function(index, obj) {
			//Check that the template has been created already
			if (!obj.instance)
				//Error
				throw new Error("Template not instantiated for " + obj);
			//Create helper map
			var helper = {};
			//Set hepler
			helper[key] = val;
			//Add helper
			obj.instance.helpers(helper);
		});
	};

	/**
	 * Add a reactive var to an instantiated template
	 * @method reactive
	 * @param {string} key - helper name
	 * @param {object|function} reactive - reactive var, must be an instance of Meteor.ReactiveVar
	 */
	jQuery.fn.reactive = function(key, reactive) {
		return this.each(function(index, obj) {
			//Check that the template has been created already
			if (!obj.instance)
				//Error
				throw new Error("Template not instantiated for " + obj);
			//Create helper map
			var helper = {};
			//Check reactive var type
			if (reactive instanceof jQuery.Meteor.ReactiveVar)
				//Set hepler
				helper[key] = function() {
					//Return the reactive var
					return reactive.get();
				};
			else if (reactive instanceof jQuery.Meteor.ReactiveObjectMap)
				//Set hepler
				helper[key] = function() {
					//Return the reactive values as array
					return reactive.values();
				};
			else if (reactive.get)
				//Set hepler
				helper[key] = function() {
					//Return the reactive var
					return reactive.get();
				};
			else if (reactive.values)
				//Set hepler
				helper[key] = function() {
					//Return the reactive values as array
					return reactive.values();
				};
			else
				//Error
				throw new Error("Unknown reactive type, neither jQuery.Meteor.ReactiveVar nor jQuery.Meteor.ReactiveObjectMap, and doesn't have values() nor get()");
			//Add helper
			obj.instance.helpers(helper);
		});
	};

	/**
	* Set renderer functions for live included templates
	* It will create a helper function that returns a template instance with the associated render function.
	* As an extra, it will copy the child helpers, that is, if a template includes a "foo" template, any "foo.bar" helper defined, will be copied to the new child template and renamed to "bar".
	* @example
	 <script type="text/spacebars" name="list">
		List:<br>
		{{#each items}}
			{{> item }}
		{{/each}}
		</script>
		<script type="text/spacebars" name="item">
		{{ foo }} {{ name }} <br>
		</script>
		<script>
		 var templates = $("script[type='text/spacebars']").spacebars();

		 $(".list").blaze(templates['list'])
			.includes('item',templates['item'])
			.helper('item.foo', function() {
				return 'bar';
			})
			.render({..});
	 </script> 
	* @method includes
	* @param {string} key - helper name
	* @param {function} renderer - renderer function for the template
	*/
	jQuery.fn.includes = function(key, renderer) {
		return this.each(function(index, obj) {
			//Check that the template has been created already
			if (!obj.instance)
				//Error
				throw new Error("Template not instantiated for " + obj);
			//Create helper map
			var helper = {};
			//Set functionhepler
			helper[key] = function() {
					return jquery.Meteor.Tracker.nonreactive(function() {
						var h = {}, k;
						//Create new template
						var include = new jQuery.Meteor.Blaze.Template(obj.id + "." + key, renderer);
						//HACK! helpers are stored with " "+name
						for (k in obj.instance.__helpers)
							//Check if it starts with template name
							if (k.indexOf(" " + key + ".") == 0)
								//Add without prefix
								h[k.substring(key.length + 2)] = obj.instance.__helpers[k];
						//Add helpers
						include.helpers(h);
						//Return template
						return include;
					});
				};
			//Add helper
			obj.instance.helpers(helper);
		});
	};
};

},{"meteor-client":2}],2:[function(require,module,exports){
module.exports = function(jQuery,underscore) {
  var Meteor = require("meteor-core")(underscore);
  require("meteor-base64")(Meteor);
  require("meteor-ejson-safe")(Meteor);
  require("meteor-random-window-crypto")(Meteor);
  require("meteor-id-map")(Meteor);
  require("meteor-ordered-dict")(Meteor);
  require("meteor-tracker")(Meteor);
  require("meteor-observe-sequence")(Meteor);
  require("meteor-htmljs")(Meteor);
  require("meteor-html-tools")(Meteor);
  require("meteor-reactive-var")(Meteor);
  require("meteor-reactive-object-map")(Meteor);
  require("meteor-blaze")(Meteor,jQuery);
  require("meteor-blaze-tools")(Meteor);
  require("meteor-templating")(Meteor);
  require("meteor-spacebars")(Meteor);
  require("meteor-spacebars-compiler")(Meteor);
  return Meteor;
};

},{"meteor-base64":3,"meteor-blaze":5,"meteor-blaze-tools":4,"meteor-core":6,"meteor-ejson-safe":7,"meteor-html-tools":8,"meteor-htmljs":9,"meteor-id-map":10,"meteor-observe-sequence":11,"meteor-ordered-dict":12,"meteor-random-window-crypto":13,"meteor-reactive-object-map":14,"meteor-reactive-var":15,"meteor-spacebars":17,"meteor-spacebars-compiler":16,"meteor-templating":18,"meteor-tracker":19}],3:[function(require,module,exports){
module.exports=function(Meteor) {
  var Base64;
// Base 64 encoding

var BASE_64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

var BASE_64_VALS = {};

for (var i = 0; i < BASE_64_CHARS.length; i++) {
  BASE_64_VALS[BASE_64_CHARS.charAt(i)] = i;
};

Base64 = {};

Base64.encode = function (array) {

  if (typeof array === "string") {
    var str = array;
    array = Base64.newBinary(str.length);
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      if (ch > 0xFF) {
        throw new Error(
          "Not ascii. Base64.encode can only take ascii strings.");
      }
      array[i] = ch;
    }
  }

  var answer = [];
  var a = null;
  var b = null;
  var c = null;
  var d = null;
  for (var i = 0; i < array.length; i++) {
    switch (i % 3) {
    case 0:
      a = (array[i] >> 2) & 0x3F;
      b = (array[i] & 0x03) << 4;
      break;
    case 1:
      b = b | (array[i] >> 4) & 0xF;
      c = (array[i] & 0xF) << 2;
      break;
    case 2:
      c = c | (array[i] >> 6) & 0x03;
      d = array[i] & 0x3F;
      answer.push(getChar(a));
      answer.push(getChar(b));
      answer.push(getChar(c));
      answer.push(getChar(d));
      a = null;
      b = null;
      c = null;
      d = null;
      break;
    }
  }
  if (a != null) {
    answer.push(getChar(a));
    answer.push(getChar(b));
    if (c == null)
      answer.push('=');
    else
      answer.push(getChar(c));
    if (d == null)
      answer.push('=');
  }
  return answer.join("");
};

var getChar = function (val) {
  return BASE_64_CHARS.charAt(val);
};

var getVal = function (ch) {
  if (ch === '=') {
    return -1;
  }
  return BASE_64_VALS[ch];
};

// XXX This is a weird place for this to live, but it's used both by
// this package and 'ejson', and we can't put it in 'ejson' without
// introducing a circular dependency. It should probably be in its own
// package or as a helper in a package that both 'base64' and 'ejson'
// use.
Base64.newBinary = function (len) {
  if (typeof Uint8Array === 'undefined' || typeof ArrayBuffer === 'undefined') {
    var ret = [];
    for (var i = 0; i < len; i++) {
      ret.push(0);
    }
    ret.$Uint8ArrayPolyfill = true;
    return ret;
  }
  return new Uint8Array(new ArrayBuffer(len));
};

Base64.decode = function (str) {
  var len = Math.floor((str.length*3)/4);
  if (str.charAt(str.length - 1) == '=') {
    len--;
    if (str.charAt(str.length - 2) == '=')
      len--;
  }
  var arr = Base64.newBinary(len);

  var one = null;
  var two = null;
  var three = null;

  var j = 0;

  for (var i = 0; i < str.length; i++) {
    var c = str.charAt(i);
    var v = getVal(c);
    switch (i % 4) {
    case 0:
      if (v < 0)
        throw new Error('invalid base64 string');
      one = v << 2;
      break;
    case 1:
      if (v < 0)
        throw new Error('invalid base64 string');
      one = one | (v >> 4);
      arr[j++] = one;
      two = (v & 0x0F) << 4;
      break;
    case 2:
      if (v >= 0) {
        two = two | (v >> 2);
        arr[j++] = two;
        three = (v & 0x03) << 6;
      }
      break;
    case 3:
      if (v >= 0) {
        arr[j++] = three | v;
      }
      break;
    }
  }
  return arr;
};
  Meteor.Base64 = Base64;
};

},{}],4:[function(require,module,exports){
module.exports = function(Meteor) {
  var _ = Meteor.underscore;
  var HTML = Meteor.HTML;
  var BlazeTools;
  var ToJSVisitor;
  var toJSLiteral;

BlazeTools = {};

BlazeTools.EmitCode = function (value) {
  if (! (this instanceof BlazeTools.EmitCode))
    // called without `new`
    return new BlazeTools.EmitCode(value);

  if (typeof value !== 'string')
    throw new Error('BlazeTools.EmitCode must be constructed with a string');

  this.value = value;
};
BlazeTools.EmitCode.prototype.toJS = function (visitor) {
  return this.value;
};

// Turns any JSONable value into a JavaScript literal.
toJSLiteral = function (obj) {
  // See <http://timelessrepo.com/json-isnt-a-javascript-subset> for `\u2028\u2029`.
  // Also escape Unicode surrogates.
  return (JSON.stringify(obj)
          .replace(/[\u2028\u2029\ud800-\udfff]/g, function (c) {
            return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4);
          }));
};
BlazeTools.toJSLiteral = toJSLiteral;



var jsReservedWordSet = (function (set) {
  _.each("abstract else instanceof super boolean enum int switch break export interface synchronized byte extends let this case false long throw catch final native throws char finally new transient class float null true const for package try continue function private typeof debugger goto protected var default if public void delete implements return volatile do import short while double in static with".split(' '), function (w) {
    set[w] = 1;
  });
  return set;
})({});

toObjectLiteralKey = function (k) {
  if (/^[a-zA-Z$_][a-zA-Z$0-9_]*$/.test(k) && jsReservedWordSet[k] !== 1)
    return k;
  return toJSLiteral(k);
};
BlazeTools.toObjectLiteralKey = toObjectLiteralKey;

var hasToJS = function (x) {
  return x.toJS && (typeof (x.toJS) === 'function');
};

ToJSVisitor = HTML.Visitor.extend();
ToJSVisitor.def({
  visitNull: function (nullOrUndefined) {
    return 'null';
  },
  visitPrimitive: function (stringBooleanOrNumber) {
    return toJSLiteral(stringBooleanOrNumber);
  },
  visitArray: function (array) {
    var parts = [];
    for (var i = 0; i < array.length; i++)
      parts.push(this.visit(array[i]));
    return '[' + parts.join(', ') + ']';
  },
  visitTag: function (tag) {
    return this.generateCall(tag.tagName, tag.attrs, tag.children);
  },
  visitComment: function (comment) {
    return this.generateCall('HTML.Comment', null, [comment.value]);
  },
  visitCharRef: function (charRef) {
    return this.generateCall('HTML.CharRef',
                             {html: charRef.html, str: charRef.str});
  },
  visitRaw: function (raw) {
    return this.generateCall('HTML.Raw', null, [raw.value]);
  },
  visitObject: function (x) {
    if (hasToJS(x)) {
      return x.toJS(this);
    }

    throw new Error("Unexpected object in HTMLjs in toJS: " + x);
  },
  generateCall: function (name, attrs, children) {
    var tagSymbol;
    if (name.indexOf('.') >= 0) {
      tagSymbol = name;
    } else if (HTML.isTagEnsured(name)) {
      tagSymbol = 'HTML.' + HTML.getSymbolName(name);
    } else {
      tagSymbol = 'HTML.getTag(' + toJSLiteral(name) + ')';
    }

    var attrsArray = null;
    if (attrs) {
      attrsArray = [];
      var needsHTMLAttrs = false;
      if (HTML.isArray(attrs)) {
        var attrsArray = [];
        for (var i = 0; i < attrs.length; i++) {
          var a = attrs[i];
          if (hasToJS(a)) {
            attrsArray.push(a.toJS(this));
            needsHTMLAttrs = true;
          } else {
            var attrsObjStr = this.generateAttrsDictionary(attrs[i]);
            if (attrsObjStr !== null)
              attrsArray.push(attrsObjStr);
          }
        }
      } else if (hasToJS(attrs)) {
        attrsArray.push(attrs.toJS(this));
        needsHTMLAttrs = true;
      } else {
        attrsArray.push(this.generateAttrsDictionary(attrs));
      }
    }
    var attrsStr = null;
    if (attrsArray && attrsArray.length) {
      if (attrsArray.length === 1 && ! needsHTMLAttrs) {
        attrsStr = attrsArray[0];
      } else {
        attrsStr = 'HTML.Attrs(' + attrsArray.join(', ') + ')';
      }
    }

    var argStrs = [];
    if (attrsStr !== null)
      argStrs.push(attrsStr);

    if (children) {
      for (var i = 0; i < children.length; i++)
        argStrs.push(this.visit(children[i]));
    }

    return tagSymbol + '(' + argStrs.join(', ') + ')';
  },
  generateAttrsDictionary: function (attrsDict) {
    if (attrsDict.toJS && (typeof (attrsDict.toJS) === 'function')) {
      // not an attrs dictionary, but something else!  Like a template tag.
      return attrsDict.toJS(this);
    }

    var kvStrs = [];
    for (var k in attrsDict) {
      if (! HTML.isNully(attrsDict[k]))
        kvStrs.push(toObjectLiteralKey(k) + ': ' +
                    this.visit(attrsDict[k]));
    }
    if (kvStrs.length)
      return '{' + kvStrs.join(', ') + '}';
    return null;
  }
});
BlazeTools.ToJSVisitor = ToJSVisitor;

BlazeTools.toJS = function (content) {
  return (new ToJSVisitor).visit(content);
};

// Adapted from source code of http://xregexp.com/plugins/#unicode
var unicodeCategories = {
  Ll: "0061-007A00B500DF-00F600F8-00FF01010103010501070109010B010D010F01110113011501170119011B011D011F01210123012501270129012B012D012F01310133013501370138013A013C013E014001420144014601480149014B014D014F01510153015501570159015B015D015F01610163016501670169016B016D016F0171017301750177017A017C017E-0180018301850188018C018D019201950199-019B019E01A101A301A501A801AA01AB01AD01B001B401B601B901BA01BD-01BF01C601C901CC01CE01D001D201D401D601D801DA01DC01DD01DF01E101E301E501E701E901EB01ED01EF01F001F301F501F901FB01FD01FF02010203020502070209020B020D020F02110213021502170219021B021D021F02210223022502270229022B022D022F02310233-0239023C023F0240024202470249024B024D024F-02930295-02AF037103730377037B-037D039003AC-03CE03D003D103D5-03D703D903DB03DD03DF03E103E303E503E703E903EB03ED03EF-03F303F503F803FB03FC0430-045F04610463046504670469046B046D046F04710473047504770479047B047D047F0481048B048D048F04910493049504970499049B049D049F04A104A304A504A704A904AB04AD04AF04B104B304B504B704B904BB04BD04BF04C204C404C604C804CA04CC04CE04CF04D104D304D504D704D904DB04DD04DF04E104E304E504E704E904EB04ED04EF04F104F304F504F704F904FB04FD04FF05010503050505070509050B050D050F05110513051505170519051B051D051F05210523052505270561-05871D00-1D2B1D6B-1D771D79-1D9A1E011E031E051E071E091E0B1E0D1E0F1E111E131E151E171E191E1B1E1D1E1F1E211E231E251E271E291E2B1E2D1E2F1E311E331E351E371E391E3B1E3D1E3F1E411E431E451E471E491E4B1E4D1E4F1E511E531E551E571E591E5B1E5D1E5F1E611E631E651E671E691E6B1E6D1E6F1E711E731E751E771E791E7B1E7D1E7F1E811E831E851E871E891E8B1E8D1E8F1E911E931E95-1E9D1E9F1EA11EA31EA51EA71EA91EAB1EAD1EAF1EB11EB31EB51EB71EB91EBB1EBD1EBF1EC11EC31EC51EC71EC91ECB1ECD1ECF1ED11ED31ED51ED71ED91EDB1EDD1EDF1EE11EE31EE51EE71EE91EEB1EED1EEF1EF11EF31EF51EF71EF91EFB1EFD1EFF-1F071F10-1F151F20-1F271F30-1F371F40-1F451F50-1F571F60-1F671F70-1F7D1F80-1F871F90-1F971FA0-1FA71FB0-1FB41FB61FB71FBE1FC2-1FC41FC61FC71FD0-1FD31FD61FD71FE0-1FE71FF2-1FF41FF61FF7210A210E210F2113212F21342139213C213D2146-2149214E21842C30-2C5E2C612C652C662C682C6A2C6C2C712C732C742C76-2C7B2C812C832C852C872C892C8B2C8D2C8F2C912C932C952C972C992C9B2C9D2C9F2CA12CA32CA52CA72CA92CAB2CAD2CAF2CB12CB32CB52CB72CB92CBB2CBD2CBF2CC12CC32CC52CC72CC92CCB2CCD2CCF2CD12CD32CD52CD72CD92CDB2CDD2CDF2CE12CE32CE42CEC2CEE2CF32D00-2D252D272D2DA641A643A645A647A649A64BA64DA64FA651A653A655A657A659A65BA65DA65FA661A663A665A667A669A66BA66DA681A683A685A687A689A68BA68DA68FA691A693A695A697A723A725A727A729A72BA72DA72F-A731A733A735A737A739A73BA73DA73FA741A743A745A747A749A74BA74DA74FA751A753A755A757A759A75BA75DA75FA761A763A765A767A769A76BA76DA76FA771-A778A77AA77CA77FA781A783A785A787A78CA78EA791A793A7A1A7A3A7A5A7A7A7A9A7FAFB00-FB06FB13-FB17FF41-FF5A",
  Lm: "02B0-02C102C6-02D102E0-02E402EC02EE0374037A0559064006E506E607F407F507FA081A0824082809710E460EC610FC17D718431AA71C78-1C7D1D2C-1D6A1D781D9B-1DBF2071207F2090-209C2C7C2C7D2D6F2E2F30053031-3035303B309D309E30FC-30FEA015A4F8-A4FDA60CA67FA717-A71FA770A788A7F8A7F9A9CFAA70AADDAAF3AAF4FF70FF9EFF9F",
  Lo: "00AA00BA01BB01C0-01C3029405D0-05EA05F0-05F20620-063F0641-064A066E066F0671-06D306D506EE06EF06FA-06FC06FF07100712-072F074D-07A507B107CA-07EA0800-08150840-085808A008A2-08AC0904-0939093D09500958-09610972-09770979-097F0985-098C098F09900993-09A809AA-09B009B209B6-09B909BD09CE09DC09DD09DF-09E109F009F10A05-0A0A0A0F0A100A13-0A280A2A-0A300A320A330A350A360A380A390A59-0A5C0A5E0A72-0A740A85-0A8D0A8F-0A910A93-0AA80AAA-0AB00AB20AB30AB5-0AB90ABD0AD00AE00AE10B05-0B0C0B0F0B100B13-0B280B2A-0B300B320B330B35-0B390B3D0B5C0B5D0B5F-0B610B710B830B85-0B8A0B8E-0B900B92-0B950B990B9A0B9C0B9E0B9F0BA30BA40BA8-0BAA0BAE-0BB90BD00C05-0C0C0C0E-0C100C12-0C280C2A-0C330C35-0C390C3D0C580C590C600C610C85-0C8C0C8E-0C900C92-0CA80CAA-0CB30CB5-0CB90CBD0CDE0CE00CE10CF10CF20D05-0D0C0D0E-0D100D12-0D3A0D3D0D4E0D600D610D7A-0D7F0D85-0D960D9A-0DB10DB3-0DBB0DBD0DC0-0DC60E01-0E300E320E330E40-0E450E810E820E840E870E880E8A0E8D0E94-0E970E99-0E9F0EA1-0EA30EA50EA70EAA0EAB0EAD-0EB00EB20EB30EBD0EC0-0EC40EDC-0EDF0F000F40-0F470F49-0F6C0F88-0F8C1000-102A103F1050-1055105A-105D106110651066106E-10701075-1081108E10D0-10FA10FD-1248124A-124D1250-12561258125A-125D1260-1288128A-128D1290-12B012B2-12B512B8-12BE12C012C2-12C512C8-12D612D8-13101312-13151318-135A1380-138F13A0-13F41401-166C166F-167F1681-169A16A0-16EA1700-170C170E-17111720-17311740-17511760-176C176E-17701780-17B317DC1820-18421844-18771880-18A818AA18B0-18F51900-191C1950-196D1970-19741980-19AB19C1-19C71A00-1A161A20-1A541B05-1B331B45-1B4B1B83-1BA01BAE1BAF1BBA-1BE51C00-1C231C4D-1C4F1C5A-1C771CE9-1CEC1CEE-1CF11CF51CF62135-21382D30-2D672D80-2D962DA0-2DA62DA8-2DAE2DB0-2DB62DB8-2DBE2DC0-2DC62DC8-2DCE2DD0-2DD62DD8-2DDE3006303C3041-3096309F30A1-30FA30FF3105-312D3131-318E31A0-31BA31F0-31FF3400-4DB54E00-9FCCA000-A014A016-A48CA4D0-A4F7A500-A60BA610-A61FA62AA62BA66EA6A0-A6E5A7FB-A801A803-A805A807-A80AA80C-A822A840-A873A882-A8B3A8F2-A8F7A8FBA90A-A925A930-A946A960-A97CA984-A9B2AA00-AA28AA40-AA42AA44-AA4BAA60-AA6FAA71-AA76AA7AAA80-AAAFAAB1AAB5AAB6AAB9-AABDAAC0AAC2AADBAADCAAE0-AAEAAAF2AB01-AB06AB09-AB0EAB11-AB16AB20-AB26AB28-AB2EABC0-ABE2AC00-D7A3D7B0-D7C6D7CB-D7FBF900-FA6DFA70-FAD9FB1DFB1F-FB28FB2A-FB36FB38-FB3CFB3EFB40FB41FB43FB44FB46-FBB1FBD3-FD3DFD50-FD8FFD92-FDC7FDF0-FDFBFE70-FE74FE76-FEFCFF66-FF6FFF71-FF9DFFA0-FFBEFFC2-FFC7FFCA-FFCFFFD2-FFD7FFDA-FFDC",
  Lt: "01C501C801CB01F21F88-1F8F1F98-1F9F1FA8-1FAF1FBC1FCC1FFC",
  Lu: "0041-005A00C0-00D600D8-00DE01000102010401060108010A010C010E01100112011401160118011A011C011E01200122012401260128012A012C012E01300132013401360139013B013D013F0141014301450147014A014C014E01500152015401560158015A015C015E01600162016401660168016A016C016E017001720174017601780179017B017D018101820184018601870189-018B018E-0191019301940196-0198019C019D019F01A001A201A401A601A701A901AC01AE01AF01B1-01B301B501B701B801BC01C401C701CA01CD01CF01D101D301D501D701D901DB01DE01E001E201E401E601E801EA01EC01EE01F101F401F6-01F801FA01FC01FE02000202020402060208020A020C020E02100212021402160218021A021C021E02200222022402260228022A022C022E02300232023A023B023D023E02410243-02460248024A024C024E03700372037603860388-038A038C038E038F0391-03A103A3-03AB03CF03D2-03D403D803DA03DC03DE03E003E203E403E603E803EA03EC03EE03F403F703F903FA03FD-042F04600462046404660468046A046C046E04700472047404760478047A047C047E0480048A048C048E04900492049404960498049A049C049E04A004A204A404A604A804AA04AC04AE04B004B204B404B604B804BA04BC04BE04C004C104C304C504C704C904CB04CD04D004D204D404D604D804DA04DC04DE04E004E204E404E604E804EA04EC04EE04F004F204F404F604F804FA04FC04FE05000502050405060508050A050C050E05100512051405160518051A051C051E05200522052405260531-055610A0-10C510C710CD1E001E021E041E061E081E0A1E0C1E0E1E101E121E141E161E181E1A1E1C1E1E1E201E221E241E261E281E2A1E2C1E2E1E301E321E341E361E381E3A1E3C1E3E1E401E421E441E461E481E4A1E4C1E4E1E501E521E541E561E581E5A1E5C1E5E1E601E621E641E661E681E6A1E6C1E6E1E701E721E741E761E781E7A1E7C1E7E1E801E821E841E861E881E8A1E8C1E8E1E901E921E941E9E1EA01EA21EA41EA61EA81EAA1EAC1EAE1EB01EB21EB41EB61EB81EBA1EBC1EBE1EC01EC21EC41EC61EC81ECA1ECC1ECE1ED01ED21ED41ED61ED81EDA1EDC1EDE1EE01EE21EE41EE61EE81EEA1EEC1EEE1EF01EF21EF41EF61EF81EFA1EFC1EFE1F08-1F0F1F18-1F1D1F28-1F2F1F38-1F3F1F48-1F4D1F591F5B1F5D1F5F1F68-1F6F1FB8-1FBB1FC8-1FCB1FD8-1FDB1FE8-1FEC1FF8-1FFB21022107210B-210D2110-211221152119-211D212421262128212A-212D2130-2133213E213F214521832C00-2C2E2C602C62-2C642C672C692C6B2C6D-2C702C722C752C7E-2C802C822C842C862C882C8A2C8C2C8E2C902C922C942C962C982C9A2C9C2C9E2CA02CA22CA42CA62CA82CAA2CAC2CAE2CB02CB22CB42CB62CB82CBA2CBC2CBE2CC02CC22CC42CC62CC82CCA2CCC2CCE2CD02CD22CD42CD62CD82CDA2CDC2CDE2CE02CE22CEB2CED2CF2A640A642A644A646A648A64AA64CA64EA650A652A654A656A658A65AA65CA65EA660A662A664A666A668A66AA66CA680A682A684A686A688A68AA68CA68EA690A692A694A696A722A724A726A728A72AA72CA72EA732A734A736A738A73AA73CA73EA740A742A744A746A748A74AA74CA74EA750A752A754A756A758A75AA75CA75EA760A762A764A766A768A76AA76CA76EA779A77BA77DA77EA780A782A784A786A78BA78DA790A792A7A0A7A2A7A4A7A6A7A8A7AAFF21-FF3A",
  Mc: "0903093B093E-09400949-094C094E094F0982098309BE-09C009C709C809CB09CC09D70A030A3E-0A400A830ABE-0AC00AC90ACB0ACC0B020B030B3E0B400B470B480B4B0B4C0B570BBE0BBF0BC10BC20BC6-0BC80BCA-0BCC0BD70C01-0C030C41-0C440C820C830CBE0CC0-0CC40CC70CC80CCA0CCB0CD50CD60D020D030D3E-0D400D46-0D480D4A-0D4C0D570D820D830DCF-0DD10DD8-0DDF0DF20DF30F3E0F3F0F7F102B102C10311038103B103C105610571062-10641067-106D108310841087-108C108F109A-109C17B617BE-17C517C717C81923-19261929-192B193019311933-193819B0-19C019C819C91A19-1A1B1A551A571A611A631A641A6D-1A721B041B351B3B1B3D-1B411B431B441B821BA11BA61BA71BAA1BAC1BAD1BE71BEA-1BEC1BEE1BF21BF31C24-1C2B1C341C351CE11CF21CF3302E302FA823A824A827A880A881A8B4-A8C3A952A953A983A9B4A9B5A9BAA9BBA9BD-A9C0AA2FAA30AA33AA34AA4DAA7BAAEBAAEEAAEFAAF5ABE3ABE4ABE6ABE7ABE9ABEAABEC",
  Mn: "0300-036F0483-04870591-05BD05BF05C105C205C405C505C70610-061A064B-065F067006D6-06DC06DF-06E406E706E806EA-06ED07110730-074A07A6-07B007EB-07F30816-0819081B-08230825-08270829-082D0859-085B08E4-08FE0900-0902093A093C0941-0948094D0951-095709620963098109BC09C1-09C409CD09E209E30A010A020A3C0A410A420A470A480A4B-0A4D0A510A700A710A750A810A820ABC0AC1-0AC50AC70AC80ACD0AE20AE30B010B3C0B3F0B41-0B440B4D0B560B620B630B820BC00BCD0C3E-0C400C46-0C480C4A-0C4D0C550C560C620C630CBC0CBF0CC60CCC0CCD0CE20CE30D41-0D440D4D0D620D630DCA0DD2-0DD40DD60E310E34-0E3A0E47-0E4E0EB10EB4-0EB90EBB0EBC0EC8-0ECD0F180F190F350F370F390F71-0F7E0F80-0F840F860F870F8D-0F970F99-0FBC0FC6102D-10301032-10371039103A103D103E10581059105E-10601071-1074108210851086108D109D135D-135F1712-17141732-1734175217531772177317B417B517B7-17BD17C617C9-17D317DD180B-180D18A91920-19221927192819321939-193B1A171A181A561A58-1A5E1A601A621A65-1A6C1A73-1A7C1A7F1B00-1B031B341B36-1B3A1B3C1B421B6B-1B731B801B811BA2-1BA51BA81BA91BAB1BE61BE81BE91BED1BEF-1BF11C2C-1C331C361C371CD0-1CD21CD4-1CE01CE2-1CE81CED1CF41DC0-1DE61DFC-1DFF20D0-20DC20E120E5-20F02CEF-2CF12D7F2DE0-2DFF302A-302D3099309AA66FA674-A67DA69FA6F0A6F1A802A806A80BA825A826A8C4A8E0-A8F1A926-A92DA947-A951A980-A982A9B3A9B6-A9B9A9BCAA29-AA2EAA31AA32AA35AA36AA43AA4CAAB0AAB2-AAB4AAB7AAB8AABEAABFAAC1AAECAAEDAAF6ABE5ABE8ABEDFB1EFE00-FE0FFE20-FE26",
  Nd: "0030-00390660-066906F0-06F907C0-07C90966-096F09E6-09EF0A66-0A6F0AE6-0AEF0B66-0B6F0BE6-0BEF0C66-0C6F0CE6-0CEF0D66-0D6F0E50-0E590ED0-0ED90F20-0F291040-10491090-109917E0-17E91810-18191946-194F19D0-19D91A80-1A891A90-1A991B50-1B591BB0-1BB91C40-1C491C50-1C59A620-A629A8D0-A8D9A900-A909A9D0-A9D9AA50-AA59ABF0-ABF9FF10-FF19",
  Nl: "16EE-16F02160-21822185-218830073021-30293038-303AA6E6-A6EF",
  Pc: "005F203F20402054FE33FE34FE4D-FE4FFF3F"
};

var unicodeClass = function (abbrev) {
  return '[' +
    unicodeCategories[abbrev].replace(/[0-9A-F]{4}/ig, "\\u$&") + ']';
};

// See ECMA-262 spec, 3rd edition, Section 7.6
// Match one or more characters that can start an identifier.
// This is IdentifierStart+.
var rIdentifierPrefix = new RegExp(
  "^([a-zA-Z$_]+|\\\\u[0-9a-fA-F]{4}|" +
    [unicodeClass('Lu'), unicodeClass('Ll'), unicodeClass('Lt'),
     unicodeClass('Lm'), unicodeClass('Lo'), unicodeClass('Nl')].join('|') +
    ")+");
// Match one or more characters that can continue an identifier.
// This is (IdentifierPart and not IdentifierStart)+.
// To match a full identifier, match rIdentifierPrefix, then
// match rIdentifierMiddle followed by rIdentifierPrefix until they both fail.
var rIdentifierMiddle = new RegExp(
  "^([0-9]|" + [unicodeClass('Mn'), unicodeClass('Mc'), unicodeClass('Nd'),
                unicodeClass('Pc')].join('|') + ")+");


// See ECMA-262 spec, 3rd edition, Section 7.8.3
var rHexLiteral = /^0[xX][0-9a-fA-F]+(?!\w)/;
var rDecLiteral =
      /^(((0|[1-9][0-9]*)(\.[0-9]*)?)|\.[0-9]+)([Ee][+-]?[0-9]+)?(?!\w)/;

// Section 7.8.4
var rStringQuote = /^["']/;
// Match one or more characters besides quotes, backslashes, or line ends
var rStringMiddle = /^(?=.)[^"'\\]+?((?!.)|(?=["'\\]))/;
// Match one escape sequence, including the backslash.
var rEscapeSequence =
      /^\\(['"\\bfnrtv]|0(?![0-9])|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|(?=.)[^ux0-9])/;
// Match one ES5 line continuation
var rLineContinuation =
      /^\\(\r\n|[\u000A\u000D\u2028\u2029])/;


BlazeTools.parseNumber = function (scanner) {
  var startPos = scanner.pos;

  var isNegative = false;
  if (scanner.peek() === '-') {
    scanner.pos++;
    isNegative = true;
  }
  // Note that we allow `"-0xa"`, unlike `Number(...)`.

  var rest = scanner.rest();
  var match = rDecLiteral.exec(rest) || rHexLiteral.exec(rest);
  if (! match) {
    scanner.pos = startPos;
    return null;
  }
  var matchText = match[0];
  scanner.pos += matchText.length;

  var text = (isNegative ? '-' : '') + matchText;
  var value = Number(matchText);
  value = (isNegative ? -value : value);
  return { text: text, value: value };
};

BlazeTools.parseIdentifierName = function (scanner) {
  var startPos = scanner.pos;
  var rest = scanner.rest();
  var match = rIdentifierPrefix.exec(rest);
  if (! match)
    return null;
  scanner.pos += match[0].length;
  rest = scanner.rest();
  var foundMore = true;

  while (foundMore) {
    foundMore = false;

    match = rIdentifierMiddle.exec(rest);
    if (match) {
      foundMore = true;
      scanner.pos += match[0].length;
      rest = scanner.rest();
    }

    match = rIdentifierPrefix.exec(rest);
    if (match) {
      foundMore = true;
      scanner.pos += match[0].length;
      rest = scanner.rest();
    }
  }

  return scanner.input.substring(startPos, scanner.pos);
};

BlazeTools.parseStringLiteral = function (scanner) {
  var startPos = scanner.pos;
  var rest = scanner.rest();
  var match = rStringQuote.exec(rest);
  if (! match)
    return null;

  var quote = match[0];
  scanner.pos++;
  rest = scanner.rest();

  var jsonLiteral = '"';

  while (match) {
    match = rStringMiddle.exec(rest);
    if (match) {
      jsonLiteral += match[0];
    } else {
      match = rEscapeSequence.exec(rest);
      if (match) {
        var esc = match[0];
        // Convert all string escapes to JSON-compatible string escapes, so we
        // can use JSON.parse for some of the work.  JSON strings are not the
        // same as JS strings.  They don't support `\0`, `\v`, `\'`, or hex
        // escapes.
        if (esc === '\\0')
          jsonLiteral += '\\u0000';
        else if (esc === '\\v')
          // Note: IE 8 doesn't correctly parse '\v' in JavaScript.
          jsonLiteral += '\\u000b';
        else if (esc.charAt(1) === 'x')
          jsonLiteral += '\\u00' + esc.slice(2);
        else if (esc === '\\\'')
          jsonLiteral += "'";
        else
          jsonLiteral += esc;
      } else {
        match = rLineContinuation.exec(rest);
        if (! match) {
          match = rStringQuote.exec(rest);
          if (match) {
            var c = match[0];
            if (c !== quote) {
              if (c === '"')
                jsonLiteral += '\\';
              jsonLiteral += c;
            }
          }
        }
      }
    }
    if (match) {
      scanner.pos += match[0].length;
      rest = scanner.rest();
      if (match[0] === quote)
        break;
    }
  }

  if (match[0] !== quote)
    scanner.fatal("Unterminated string literal");

  jsonLiteral += '"';
  var text = scanner.input.substring(startPos, scanner.pos);
  var value = JSON.parse(jsonLiteral);
  return { text: text, value: value };
};
  Meteor.BlazeTools = BlazeTools;
};

},{}],5:[function(require,module,exports){
module.exports = function(Meteor,jQuery) {
  var _ = Meteor.underscore;
  var HTML = Meteor.HTML;
  var ObserveSequence = Meteor.ObserveSequence;
  var ReactiveVar = Meteor.ReactiveVar;
  var Tracker = Meteor.Tracker;
  var Blaze;

/**
 * @namespace Blaze
 * @summary The namespace for all Blaze-related methods and classes.
 */
Blaze = {};

// Utility to HTML-escape a string.  Included for legacy reasons.
Blaze._escape = (function() {
  var escape_map = {
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "`": "&#x60;", /* IE allows backtick-delimited attributes?? */
    "&": "&amp;"
  };
  var escape_one = function(c) {
    return escape_map[c];
  };

  return function (x) {
    return x.replace(/[&<>"'`]/g, escape_one);
  };
})();

Blaze._warn = function (msg) {
  msg = 'Warning: ' + msg;

  if ((typeof Log !== 'undefined') && Log && Log.warn)
    Log.warn(msg); // use Meteor's "logging" package
  else if ((typeof console !== 'undefined') && console.log)
    console.log(msg);
};
var DOMBackend = {};
Blaze._DOMBackend = DOMBackend;

var $jq = (typeof jQuery !== 'undefined' ? jQuery :
           (typeof Package !== 'undefined' ?
            Package.jquery && Package.jquery.jQuery : null));
if (! $jq)
  throw new Error("jQuery not found");

DOMBackend._$jq = $jq;

DOMBackend.parseHTML = function (html) {
  // Return an array of nodes.
  //
  // jQuery does fancy stuff like creating an appropriate
  // container element and setting innerHTML on it, as well
  // as working around various IE quirks.
  return $jq.parseHTML(html) || [];
};

DOMBackend.Events = {
  // `selector` is non-null.  `type` is one type (but
  // may be in backend-specific form, e.g. have namespaces).
  // Order fired must be order bound.
  delegateEvents: function (elem, type, selector, handler) {
    $jq(elem).on(type, selector, handler);
  },

  undelegateEvents: function (elem, type, handler) {
    $jq(elem).off(type, '**', handler);
  },

  bindEventCapturer: function (elem, type, selector, handler) {
    var $elem = $jq(elem);

    var wrapper = function (event) {
      event = $jq.event.fix(event);
      event.currentTarget = event.target;

      // Note: It might improve jQuery interop if we called into jQuery
      // here somehow.  Since we don't use jQuery to dispatch the event,
      // we don't fire any of jQuery's event hooks or anything.  However,
      // since jQuery can't bind capturing handlers, it's not clear
      // where we would hook in.  Internal jQuery functions like `dispatch`
      // are too high-level.
      var $target = $jq(event.currentTarget);
      if ($target.is($elem.find(selector)))
        handler.call(elem, event);
    };

    handler._meteorui_wrapper = wrapper;

    type = DOMBackend.Events.parseEventType(type);
    // add *capturing* event listener
    elem.addEventListener(type, wrapper, true);
  },

  unbindEventCapturer: function (elem, type, handler) {
    type = DOMBackend.Events.parseEventType(type);
    elem.removeEventListener(type, handler._meteorui_wrapper, true);
  },

  parseEventType: function (type) {
    // strip off namespaces
    var dotLoc = type.indexOf('.');
    if (dotLoc >= 0)
      return type.slice(0, dotLoc);
    return type;
  }
};


///// Removal detection and interoperability.

// For an explanation of this technique, see:
// http://bugs.jquery.com/ticket/12213#comment:23 .
//
// In short, an element is considered "removed" when jQuery
// cleans up its *private* userdata on the element,
// which we can detect using a custom event with a teardown
// hook.

var NOOP = function () {};

// Circular doubly-linked list
var TeardownCallback = function (func) {
  this.next = this;
  this.prev = this;
  this.func = func;
};

// Insert newElt before oldElt in the circular list
TeardownCallback.prototype.linkBefore = function(oldElt) {
  this.prev = oldElt.prev;
  this.next = oldElt;
  oldElt.prev.next = this;
  oldElt.prev = this;
};

TeardownCallback.prototype.unlink = function () {
  this.prev.next = this.next;
  this.next.prev = this.prev;
};

TeardownCallback.prototype.go = function () {
  var func = this.func;
  func && func();
};

TeardownCallback.prototype.stop = TeardownCallback.prototype.unlink;

DOMBackend.Teardown = {
  _JQUERY_EVENT_NAME: 'blaze_teardown_watcher',
  _CB_PROP: '$blaze_teardown_callbacks',
  // Registers a callback function to be called when the given element or
  // one of its ancestors is removed from the DOM via the backend library.
  // The callback function is called at most once, and it receives the element
  // in question as an argument.
  onElementTeardown: function (elem, func) {
    var elt = new TeardownCallback(func);

    var propName = DOMBackend.Teardown._CB_PROP;
    if (! elem[propName]) {
      // create an empty node that is never unlinked
      elem[propName] = new TeardownCallback;

      // Set up the event, only the first time.
      $jq(elem).on(DOMBackend.Teardown._JQUERY_EVENT_NAME, NOOP);
    }

    elt.linkBefore(elem[propName]);

    return elt; // so caller can call stop()
  },
  // Recursively call all teardown hooks, in the backend and registered
  // through DOMBackend.onElementTeardown.
  tearDownElement: function (elem) {
    var elems = [];
    // Array.prototype.slice.call doesn't work when given a NodeList in
    // IE8 ("JScript object expected").
    var nodeList = elem.getElementsByTagName('*');
    for (var i = 0; i < nodeList.length; i++) {
      elems.push(nodeList[i]);
    }
    elems.push(elem);
    $jq.cleanData(elems);
  }
};

$jq.event.special[DOMBackend.Teardown._JQUERY_EVENT_NAME] = {
  setup: function () {
    // This "setup" callback is important even though it is empty!
    // Without it, jQuery will call addEventListener, which is a
    // performance hit, especially with Chrome's async stack trace
    // feature enabled.
  },
  teardown: function() {
    var elem = this;
    var callbacks = elem[DOMBackend.Teardown._CB_PROP];
    if (callbacks) {
      var elt = callbacks.next;
      while (elt !== callbacks) {
        elt.go();
        elt = elt.next;
      }
      callbacks.go();

      elem[DOMBackend.Teardown._CB_PROP] = null;
    }
  }
};


// Must use jQuery semantics for `context`, not
// querySelectorAll's.  In other words, all the parts
// of `selector` must be found under `context`.
DOMBackend.findBySelector = function (selector, context) {
  return $jq(selector, context);
};

// A constant empty array (frozen if the JS engine supports it).
var _emptyArray = Object.freeze ? Object.freeze([]) : [];

// `[new] Blaze._DOMRange([nodeAndRangeArray])`
//
// A DOMRange consists of an array of consecutive nodes and DOMRanges,
// which may be replaced at any time with a new array.  If the DOMRange
// has been attached to the DOM at some location, then updating
// the array will cause the DOM to be updated at that location.
Blaze._DOMRange = function (nodeAndRangeArray) {
  if (! (this instanceof DOMRange))
    // called without `new`
    return new DOMRange(nodeAndRangeArray);

  var members = (nodeAndRangeArray || _emptyArray);
  if (! (members && (typeof members.length) === 'number'))
    throw new Error("Expected array");

  for (var i = 0; i < members.length; i++)
    this._memberIn(members[i]);

  this.members = members;
  this.emptyRangePlaceholder = null;
  this.attached = false;
  this.parentElement = null;
  this.parentRange = null;
  this.attachedCallbacks = _emptyArray;
};
var DOMRange = Blaze._DOMRange;

// In IE 8, don't use empty text nodes as placeholders
// in empty DOMRanges, use comment nodes instead.  Using
// empty text nodes in modern browsers is great because
// it doesn't clutter the web inspector.  In IE 8, however,
// it seems to lead in some roundabout way to the OAuth
// pop-up crashing the browser completely.  In the past,
// we didn't use empty text nodes on IE 8 because they
// don't accept JS properties, so just use the same logic
// even though we don't need to set properties on the
// placeholder anymore.
DOMRange._USE_COMMENT_PLACEHOLDERS = (function () {
  var result = false;
  var textNode = document.createTextNode("");
  try {
    textNode.someProp = true;
  } catch (e) {
    // IE 8
    result = true;
  }
  return result;
})();

// static methods
DOMRange._insert = function (rangeOrNode, parentElement, nextNode, _isMove) {
  var m = rangeOrNode;
  if (m instanceof DOMRange) {
    m.attach(parentElement, nextNode, _isMove);
  } else {
    if (_isMove)
      DOMRange._moveNodeWithHooks(m, parentElement, nextNode);
    else
      DOMRange._insertNodeWithHooks(m, parentElement, nextNode);
  }
};

DOMRange._remove = function (rangeOrNode) {
  var m = rangeOrNode;
  if (m instanceof DOMRange) {
    m.detach();
  } else {
    DOMRange._removeNodeWithHooks(m);
  }
};

DOMRange._removeNodeWithHooks = function (n) {
  if (! n.parentNode)
    return;
  if (n.nodeType === 1 &&
      n.parentNode._uihooks && n.parentNode._uihooks.removeElement) {
    n.parentNode._uihooks.removeElement(n);
  } else {
    n.parentNode.removeChild(n);
  }
};

DOMRange._insertNodeWithHooks = function (n, parent, next) {
  // `|| null` because IE throws an error if 'next' is undefined
  next = next || null;
  if (n.nodeType === 1 &&
      parent._uihooks && parent._uihooks.insertElement) {
    parent._uihooks.insertElement(n, next);
  } else {
    parent.insertBefore(n, next);
  }
};

DOMRange._moveNodeWithHooks = function (n, parent, next) {
  if (n.parentNode !== parent)
    return;
  // `|| null` because IE throws an error if 'next' is undefined
  next = next || null;
  if (n.nodeType === 1 &&
      parent._uihooks && parent._uihooks.moveElement) {
    parent._uihooks.moveElement(n, next);
  } else {
    parent.insertBefore(n, next);
  }
};

DOMRange.forElement = function (elem) {
  if (elem.nodeType !== 1)
    throw new Error("Expected element, found: " + elem);
  var range = null;
  while (elem && ! range) {
    range = (elem.$blaze_range || null);
    if (! range)
      elem = elem.parentNode;
  }
  return range;
};

DOMRange.prototype.attach = function (parentElement, nextNode, _isMove, _isReplace) {
  // This method is called to insert the DOMRange into the DOM for
  // the first time, but it's also used internally when
  // updating the DOM.
  //
  // If _isMove is true, move this attached range to a different
  // location under the same parentElement.
  if (_isMove || _isReplace) {
    if (! (this.parentElement === parentElement &&
           this.attached))
      throw new Error("Can only move or replace an attached DOMRange, and only under the same parent element");
  }

  var members = this.members;
  if (members.length) {
    this.emptyRangePlaceholder = null;
    for (var i = 0; i < members.length; i++) {
      DOMRange._insert(members[i], parentElement, nextNode, _isMove);
    }
  } else {
    var placeholder = (
      DOMRange._USE_COMMENT_PLACEHOLDERS ?
        document.createComment("") :
        document.createTextNode(""));
    this.emptyRangePlaceholder = placeholder;
    parentElement.insertBefore(placeholder, nextNode || null);
  }
  this.attached = true;
  this.parentElement = parentElement;

  if (! (_isMove || _isReplace)) {
    for(var i = 0; i < this.attachedCallbacks.length; i++) {
      var obj = this.attachedCallbacks[i];
      obj.attached && obj.attached(this, parentElement);
    }
  }
};

DOMRange.prototype.setMembers = function (newNodeAndRangeArray) {
  var newMembers = newNodeAndRangeArray;
  if (! (newMembers && (typeof newMembers.length) === 'number'))
    throw new Error("Expected array");

  var oldMembers = this.members;

  for (var i = 0; i < oldMembers.length; i++)
    this._memberOut(oldMembers[i]);
  for (var i = 0; i < newMembers.length; i++)
    this._memberIn(newMembers[i]);

  if (! this.attached) {
    this.members = newMembers;
  } else {
    // don't do anything if we're going from empty to empty
    if (newMembers.length || oldMembers.length) {
      // detach the old members and insert the new members
      var nextNode = this.lastNode().nextSibling;
      var parentElement = this.parentElement;
      // Use detach/attach, but don't fire attached/detached hooks
      this.detach(true /*_isReplace*/);
      this.members = newMembers;
      this.attach(parentElement, nextNode, false, true /*_isReplace*/);
    }
  }
};

DOMRange.prototype.firstNode = function () {
  if (! this.attached)
    throw new Error("Must be attached");

  if (! this.members.length)
    return this.emptyRangePlaceholder;

  var m = this.members[0];
  return (m instanceof DOMRange) ? m.firstNode() : m;
};

DOMRange.prototype.lastNode = function () {
  if (! this.attached)
    throw new Error("Must be attached");

  if (! this.members.length)
    return this.emptyRangePlaceholder;

  var m = this.members[this.members.length - 1];
  return (m instanceof DOMRange) ? m.lastNode() : m;
};

DOMRange.prototype.detach = function (_isReplace) {
  if (! this.attached)
    throw new Error("Must be attached");

  var oldParentElement = this.parentElement;
  var members = this.members;
  if (members.length) {
    for (var i = 0; i < members.length; i++) {
      DOMRange._remove(members[i]);
    }
  } else {
    var placeholder = this.emptyRangePlaceholder;
    this.parentElement.removeChild(placeholder);
    this.emptyRangePlaceholder = null;
  }

  if (! _isReplace) {
    this.attached = false;
    this.parentElement = null;

    for(var i = 0; i < this.attachedCallbacks.length; i++) {
      var obj = this.attachedCallbacks[i];
      obj.detached && obj.detached(this, oldParentElement);
    }
  }
};

DOMRange.prototype.addMember = function (newMember, atIndex, _isMove) {
  var members = this.members;
  if (! (atIndex >= 0 && atIndex <= members.length))
    throw new Error("Bad index in range.addMember: " + atIndex);

  if (! _isMove)
    this._memberIn(newMember);

  if (! this.attached) {
    // currently detached; just updated members
    members.splice(atIndex, 0, newMember);
  } else if (members.length === 0) {
    // empty; use the empty-to-nonempty handling of setMembers
    this.setMembers([newMember]);
  } else {
    var nextNode;
    if (atIndex === members.length) {
      // insert at end
      nextNode = this.lastNode().nextSibling;
    } else {
      var m = members[atIndex];
      nextNode = (m instanceof DOMRange) ? m.firstNode() : m;
    }
    members.splice(atIndex, 0, newMember);
    DOMRange._insert(newMember, this.parentElement, nextNode, _isMove);
  }
};

DOMRange.prototype.removeMember = function (atIndex, _isMove) {
  var members = this.members;
  if (! (atIndex >= 0 && atIndex < members.length))
    throw new Error("Bad index in range.removeMember: " + atIndex);

  if (_isMove) {
    members.splice(atIndex, 1);
  } else {
    var oldMember = members[atIndex];
    this._memberOut(oldMember);

    if (members.length === 1) {
      // becoming empty; use the logic in setMembers
      this.setMembers(_emptyArray);
    } else {
      members.splice(atIndex, 1);
      if (this.attached)
        DOMRange._remove(oldMember);
    }
  }
};

DOMRange.prototype.moveMember = function (oldIndex, newIndex) {
  var member = this.members[oldIndex];
  this.removeMember(oldIndex, true /*_isMove*/);
  this.addMember(member, newIndex, true /*_isMove*/);
};

DOMRange.prototype.getMember = function (atIndex) {
  var members = this.members;
  if (! (atIndex >= 0 && atIndex < members.length))
    throw new Error("Bad index in range.getMember: " + atIndex);
  return this.members[atIndex];
};

DOMRange.prototype._memberIn = function (m) {
  if (m instanceof DOMRange)
    m.parentRange = this;
  else if (m.nodeType === 1) // DOM Element
    m.$blaze_range = this;
};

DOMRange._destroy = function (m, _skipNodes) {
  if (m instanceof DOMRange) {
    if (m.view)
      Blaze._destroyView(m.view, _skipNodes);
  } else if ((! _skipNodes) && m.nodeType === 1) {
    // DOM Element
    if (m.$blaze_range) {
      Blaze._destroyNode(m);
      m.$blaze_range = null;
    }
  }
};

DOMRange.prototype._memberOut = DOMRange._destroy;

// Tear down, but don't remove, the members.  Used when chunks
// of DOM are being torn down or replaced.
DOMRange.prototype.destroyMembers = function (_skipNodes) {
  var members = this.members;
  for (var i = 0; i < members.length; i++)
    this._memberOut(members[i], _skipNodes);
};

DOMRange.prototype.destroy = function (_skipNodes) {
  DOMRange._destroy(this, _skipNodes);
};

DOMRange.prototype.containsElement = function (elem) {
  if (! this.attached)
    throw new Error("Must be attached");

  // An element is contained in this DOMRange if it's possible to
  // reach it by walking parent pointers, first through the DOM and
  // then parentRange pointers.  In other words, the element or some
  // ancestor of it is at our level of the DOM (a child of our
  // parentElement), and this element is one of our members or
  // is a member of a descendant Range.

  // First check that elem is a descendant of this.parentElement,
  // according to the DOM.
  if (! Blaze._elementContains(this.parentElement, elem))
    return false;

  // If elem is not an immediate child of this.parentElement,
  // walk up to its ancestor that is.
  while (elem.parentNode !== this.parentElement)
    elem = elem.parentNode;

  var range = elem.$blaze_range;
  while (range && range !== this)
    range = range.parentRange;

  return range === this;
};

DOMRange.prototype.containsRange = function (range) {
  if (! this.attached)
    throw new Error("Must be attached");

  if (! range.attached)
    return false;

  // A DOMRange is contained in this DOMRange if it's possible
  // to reach this range by following parent pointers.  If the
  // DOMRange has the same parentElement, then it should be
  // a member, or a member of a member etc.  Otherwise, we must
  // contain its parentElement.

  if (range.parentElement !== this.parentElement)
    return this.containsElement(range.parentElement);

  if (range === this)
    return false; // don't contain self

  while (range && range !== this)
    range = range.parentRange;

  return range === this;
};

DOMRange.prototype.onAttached = function (attached) {
  this.onAttachedDetached({ attached: attached });
};

// callbacks are `attached(range, element)` and
// `detached(range, element)`, and they may
// access the `callbacks` object in `this`.
// The arguments to `detached` are the same
// range and element that were passed to `attached`.
DOMRange.prototype.onAttachedDetached = function (callbacks) {
  if (this.attachedCallbacks === _emptyArray)
    this.attachedCallbacks = [];
  this.attachedCallbacks.push(callbacks);
};

DOMRange.prototype.$ = function (selector) {
  var self = this;

  var parentNode = this.parentElement;
  if (! parentNode)
    throw new Error("Can't select in removed DomRange");

  // Strategy: Find all selector matches under parentNode,
  // then filter out the ones that aren't in this DomRange
  // using `DOMRange#containsElement`.  This is
  // asymptotically slow in the presence of O(N) sibling
  // content that is under parentNode but not in our range,
  // so if performance is an issue, the selector should be
  // run on a child element.

  // Since jQuery can't run selectors on a DocumentFragment,
  // we don't expect findBySelector to work.
  if (parentNode.nodeType === 11 /* DocumentFragment */)
    throw new Error("Can't use $ on an offscreen range");

  var results = Blaze._DOMBackend.findBySelector(selector, parentNode);

  // We don't assume `results` has jQuery API; a plain array
  // should do just as well.  However, if we do have a jQuery
  // array, we want to end up with one also, so we use
  // `.filter`.

  // Function that selects only elements that are actually
  // in this DomRange, rather than simply descending from
  // `parentNode`.
  var filterFunc = function (elem) {
    // handle jQuery's arguments to filter, where the node
    // is in `this` and the index is the first argument.
    if (typeof elem === 'number')
      elem = this;

    return self.containsElement(elem);
  };

  if (! results.filter) {
    // not a jQuery array, and not a browser with
    // Array.prototype.filter (e.g. IE <9)
    var newResults = [];
    for (var i = 0; i < results.length; i++) {
      var x = results[i];
      if (filterFunc(x))
        newResults.push(x);
    }
    results = newResults;
  } else {
    // `results.filter` is either jQuery's or ECMAScript's `filter`
    results = results.filter(filterFunc);
  }

  return results;
};

// Returns true if element a contains node b and is not node b.
//
// The restriction that `a` be an element (not a document fragment,
// say) is based on what's easy to implement cross-browser.
Blaze._elementContains = function (a, b) {
  if (a.nodeType !== 1) // ELEMENT
    return false;
  if (a === b)
    return false;

  if (a.compareDocumentPosition) {
    return a.compareDocumentPosition(b) & 0x10;
  } else {
    // Should be only old IE and maybe other old browsers here.
    // Modern Safari has both functions but seems to get contains() wrong.
    // IE can't handle b being a text node.  We work around this
    // by doing a direct parent test now.
    b = b.parentNode;
    if (! (b && b.nodeType === 1)) // ELEMENT
      return false;
    if (a === b)
      return true;

    return a.contains(b);
  }
};
var EventSupport = Blaze._EventSupport = {};

var DOMBackend = Blaze._DOMBackend;

// List of events to always delegate, never capture.
// Since jQuery fakes bubbling for certain events in
// certain browsers (like `submit`), we don't want to
// get in its way.
//
// We could list all known bubbling
// events here to avoid creating speculative capturers
// for them, but it would only be an optimization.
var eventsToDelegate = EventSupport.eventsToDelegate = {
  blur: 1, change: 1, click: 1, focus: 1, focusin: 1,
  focusout: 1, reset: 1, submit: 1
};

var EVENT_MODE = EventSupport.EVENT_MODE = {
  TBD: 0,
  BUBBLING: 1,
  CAPTURING: 2
};

var NEXT_HANDLERREC_ID = 1;

var HandlerRec = function (elem, type, selector, handler, recipient) {
  this.elem = elem;
  this.type = type;
  this.selector = selector;
  this.handler = handler;
  this.recipient = recipient;
  this.id = (NEXT_HANDLERREC_ID++);

  this.mode = EVENT_MODE.TBD;

  // It's important that delegatedHandler be a different
  // instance for each handlerRecord, because its identity
  // is used to remove it.
  //
  // It's also important that the closure have access to
  // `this` when it is not called with it set.
  this.delegatedHandler = (function (h) {
    return function (evt) {
      if ((! h.selector) && evt.currentTarget !== evt.target)
        // no selector means only fire on target
        return;
      return h.handler.apply(h.recipient, arguments);
    };
  })(this);

  // WHY CAPTURE AND DELEGATE: jQuery can't delegate
  // non-bubbling events, because
  // event capture doesn't work in IE 8.  However, there
  // are all sorts of new-fangled non-bubbling events
  // like "play" and "touchenter".  We delegate these
  // events using capture in all browsers except IE 8.
  // IE 8 doesn't support these events anyway.

  var tryCapturing = elem.addEventListener &&
        (! _.has(eventsToDelegate,
                 DOMBackend.Events.parseEventType(type)));

  if (tryCapturing) {
    this.capturingHandler = (function (h) {
      return function (evt) {
        if (h.mode === EVENT_MODE.TBD) {
          // must be first time we're called.
          if (evt.bubbles) {
            // this type of event bubbles, so don't
            // get called again.
            h.mode = EVENT_MODE.BUBBLING;
            DOMBackend.Events.unbindEventCapturer(
              h.elem, h.type, h.capturingHandler);
            return;
          } else {
            // this type of event doesn't bubble,
            // so unbind the delegation, preventing
            // it from ever firing.
            h.mode = EVENT_MODE.CAPTURING;
            DOMBackend.Events.undelegateEvents(
              h.elem, h.type, h.delegatedHandler);
          }
        }

        h.delegatedHandler(evt);
      };
    })(this);

  } else {
    this.mode = EVENT_MODE.BUBBLING;
  }
};
EventSupport.HandlerRec = HandlerRec;

HandlerRec.prototype.bind = function () {
  // `this.mode` may be EVENT_MODE_TBD, in which case we bind both. in
  // this case, 'capturingHandler' is in charge of detecting the
  // correct mode and turning off one or the other handlers.
  if (this.mode !== EVENT_MODE.BUBBLING) {
    DOMBackend.Events.bindEventCapturer(
      this.elem, this.type, this.selector || '*',
      this.capturingHandler);
  }

  if (this.mode !== EVENT_MODE.CAPTURING)
    DOMBackend.Events.delegateEvents(
      this.elem, this.type,
      this.selector || '*', this.delegatedHandler);
};

HandlerRec.prototype.unbind = function () {
  if (this.mode !== EVENT_MODE.BUBBLING)
    DOMBackend.Events.unbindEventCapturer(this.elem, this.type,
                                          this.capturingHandler);

  if (this.mode !== EVENT_MODE.CAPTURING)
    DOMBackend.Events.undelegateEvents(this.elem, this.type,
                                       this.delegatedHandler);
};

EventSupport.listen = function (element, events, selector, handler, recipient, getParentRecipient) {

  // Prevent this method from being JITed by Safari.  Due to a
  // presumed JIT bug in Safari -- observed in Version 7.0.6
  // (9537.78.2) -- this method may crash the Safari render process if
  // it is JITed.
  // Repro: https://github.com/dgreensp/public/tree/master/safari-crash
  try { element = element; } finally {}

  var eventTypes = [];
  events.replace(/[^ /]+/g, function (e) {
    eventTypes.push(e);
  });

  var newHandlerRecs = [];
  for (var i = 0, N = eventTypes.length; i < N; i++) {
    var type = eventTypes[i];

    var eventDict = element.$blaze_events;
    if (! eventDict)
      eventDict = (element.$blaze_events = {});

    var info = eventDict[type];
    if (! info) {
      info = eventDict[type] = {};
      info.handlers = [];
    }
    var handlerList = info.handlers;
    var handlerRec = new HandlerRec(
      element, type, selector, handler, recipient);
    newHandlerRecs.push(handlerRec);
    handlerRec.bind();
    handlerList.push(handlerRec);
    // Move handlers of enclosing ranges to end, by unbinding and rebinding
    // them.  In jQuery (or other DOMBackend) this causes them to fire
    // later when the backend dispatches event handlers.
    if (getParentRecipient) {
      for (var r = getParentRecipient(recipient); r;
           r = getParentRecipient(r)) {
        // r is an enclosing range (recipient)
        for (var j = 0, Nj = handlerList.length;
             j < Nj; j++) {
          var h = handlerList[j];
          if (h.recipient === r) {
            h.unbind();
            h.bind();
            handlerList.splice(j, 1); // remove handlerList[j]
            handlerList.push(h);
            j--; // account for removed handler
            Nj--; // don't visit appended handlers
          }
        }
      }
    }
  }

  return {
    // closes over just `element` and `newHandlerRecs`
    stop: function () {
      var eventDict = element.$blaze_events;
      if (! eventDict)
        return;
      // newHandlerRecs has only one item unless you specify multiple
      // event types.  If this code is slow, it's because we have to
      // iterate over handlerList here.  Clearing a whole handlerList
      // via stop() methods is O(N^2) in the number of handlers on
      // an element.
      for (var i = 0; i < newHandlerRecs.length; i++) {
        var handlerToRemove = newHandlerRecs[i];
        var info = eventDict[handlerToRemove.type];
        if (! info)
          continue;
        var handlerList = info.handlers;
        for (var j = handlerList.length - 1; j >= 0; j--) {
          if (handlerList[j] === handlerToRemove) {
            handlerToRemove.unbind();
            handlerList.splice(j, 1); // remove handlerList[j]
          }
        }
      }
      newHandlerRecs.length = 0;
    }
  };
};
var jsUrlsAllowed = false;
Blaze._allowJavascriptUrls = function () {
  jsUrlsAllowed = true;
};
Blaze._javascriptUrlsAllowed = function () {
  return jsUrlsAllowed;
};

// An AttributeHandler object is responsible for updating a particular attribute
// of a particular element.  AttributeHandler subclasses implement
// browser-specific logic for dealing with particular attributes across
// different browsers.
//
// To define a new type of AttributeHandler, use
// `var FooHandler = AttributeHandler.extend({ update: function ... })`
// where the `update` function takes arguments `(element, oldValue, value)`.
// The `element` argument is always the same between calls to `update` on
// the same instance.  `oldValue` and `value` are each either `null` or
// a Unicode string of the type that might be passed to the value argument
// of `setAttribute` (i.e. not an HTML string with character references).
// When an AttributeHandler is installed, an initial call to `update` is
// always made with `oldValue = null`.  The `update` method can access
// `this.name` if the AttributeHandler class is a generic one that applies
// to multiple attribute names.
//
// AttributeHandlers can store custom properties on `this`, as long as they
// don't use the names `element`, `name`, `value`, and `oldValue`.
//
// AttributeHandlers can't influence how attributes appear in rendered HTML,
// only how they are updated after materialization as DOM.

AttributeHandler = function (name, value) {
  this.name = name;
  this.value = value;
};
Blaze._AttributeHandler = AttributeHandler;

AttributeHandler.prototype.update = function (element, oldValue, value) {
  if (value === null) {
    if (oldValue !== null)
      element.removeAttribute(this.name);
  } else {
    element.setAttribute(this.name, value);
  }
};

AttributeHandler.extend = function (options) {
  var curType = this;
  var subType = function AttributeHandlerSubtype(/*arguments*/) {
    AttributeHandler.apply(this, arguments);
  };
  subType.prototype = new curType;
  subType.extend = curType.extend;
  if (options)
    _.extend(subType.prototype, options);
  return subType;
};

/// Apply the diff between the attributes of "oldValue" and "value" to "element."
//
// Each subclass must implement a parseValue method which takes a string
// as an input and returns a dict of attributes. The keys of the dict
// are unique identifiers (ie. css properties in the case of styles), and the
// values are the entire attribute which will be injected into the element.
//
// Extended below to support classes, SVG elements and styles.

var DiffingAttributeHandler = AttributeHandler.extend({
  update: function (element, oldValue, value) {
    if (!this.getCurrentValue || !this.setValue || !this.parseValue)
      throw new Error("Missing methods in subclass of 'DiffingAttributeHandler'");

    var oldAttrsMap = oldValue ? this.parseValue(oldValue) : {};
    var newAttrsMap = value ? this.parseValue(value) : {};

    // the current attributes on the element, which we will mutate.

    var attrString = this.getCurrentValue(element);
    var attrsMap = attrString ? this.parseValue(attrString) : {};

    _.each(_.keys(oldAttrsMap), function (t) {
      if (! (t in newAttrsMap))
        delete attrsMap[t];
    });

    _.each(_.keys(newAttrsMap), function (t) {
      attrsMap[t] = newAttrsMap[t];
    });

    this.setValue(element, _.values(attrsMap).join(' '));
  }
});

var ClassHandler = DiffingAttributeHandler.extend({
  // @param rawValue {String}
  getCurrentValue: function (element) {
    return element.className;
  },
  setValue: function (element, className) {
    element.className = className;
  },
  parseValue: function (attrString) {
    var tokens = {};

    _.each(attrString.split(' '), function(token) {
      if (token)
        tokens[token] = token;
    });
    return tokens;
  }
});

var SVGClassHandler = ClassHandler.extend({
  getCurrentValue: function (element) {
    return element.className.baseVal;
  },
  setValue: function (element, className) {
    element.setAttribute('class', className);
  }
});

var StyleHandler = DiffingAttributeHandler.extend({
  getCurrentValue: function (element) {
    return element.getAttribute('style');
  },
  setValue: function (element, style) {
    if (style === '') {
      element.removeAttribute('style');
    } else {
      element.setAttribute('style', style);
    }
  },

  // Parse a string to produce a map from property to attribute string.
  //
  // Example:
  // "color:red; foo:12px" produces a token {color: "color:red", foo:"foo:12px"}
  parseValue: function (attrString) {
    var tokens = {};

    // Regex for parsing a css attribute declaration, taken from css-parse:
    // https://github.com/reworkcss/css-parse/blob/7cef3658d0bba872cde05a85339034b187cb3397/index.js#L219
    var regex = /(\*?[-#\/\*\\\w]+(?:\[[0-9a-z_-]+\])?)\s*:\s*(?:\'(?:\\\'|.)*?\'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+[;\s]*/g;
    var match = regex.exec(attrString);
    while (match) {
      // match[0] = entire matching string
      // match[1] = css property
      // Prefix the token to prevent conflicts with existing properties.

      // XXX No `String.trim` on Safari 4. Swap out $.trim if we want to
      // remove strong dep on jquery.
      tokens[' ' + match[1]] = match[0].trim ?
        match[0].trim() : $.trim(match[0]);

      match = regex.exec(attrString);
    }

    return tokens;
  }
});

var BooleanHandler = AttributeHandler.extend({
  update: function (element, oldValue, value) {
    var name = this.name;
    if (value == null) {
      if (oldValue != null)
        element[name] = false;
    } else {
      element[name] = true;
    }
  }
});

var ValueHandler = AttributeHandler.extend({
  update: function (element, oldValue, value) {
    if (value !== element.value)
      element.value = value;
  }
});

// attributes of the type 'xlink:something' should be set using
// the correct namespace in order to work
var XlinkHandler = AttributeHandler.extend({
  update: function(element, oldValue, value) {
    var NS = 'http://www.w3.org/1999/xlink';
    if (value === null) {
      if (oldValue !== null)
        element.removeAttributeNS(NS, this.name);
    } else {
      element.setAttributeNS(NS, this.name, this.value);
    }
  }
});

// cross-browser version of `instanceof SVGElement`
var isSVGElement = function (elem) {
  return 'ownerSVGElement' in elem;
};

var isUrlAttribute = function (tagName, attrName) {
  // Compiled from http://www.w3.org/TR/REC-html40/index/attributes.html
  // and
  // http://www.w3.org/html/wg/drafts/html/master/index.html#attributes-1
  var urlAttrs = {
    FORM: ['action'],
    BODY: ['background'],
    BLOCKQUOTE: ['cite'],
    Q: ['cite'],
    DEL: ['cite'],
    INS: ['cite'],
    OBJECT: ['classid', 'codebase', 'data', 'usemap'],
    APPLET: ['codebase'],
    A: ['href'],
    AREA: ['href'],
    LINK: ['href'],
    BASE: ['href'],
    IMG: ['longdesc', 'src', 'usemap'],
    FRAME: ['longdesc', 'src'],
    IFRAME: ['longdesc', 'src'],
    HEAD: ['profile'],
    SCRIPT: ['src'],
    INPUT: ['src', 'usemap', 'formaction'],
    BUTTON: ['formaction'],
    BASE: ['href'],
    MENUITEM: ['icon'],
    HTML: ['manifest'],
    VIDEO: ['poster']
  };

  if (attrName === 'itemid') {
    return true;
  }

  var urlAttrNames = urlAttrs[tagName] || [];
  return _.contains(urlAttrNames, attrName);
};

// To get the protocol for a URL, we let the browser normalize it for
// us, by setting it as the href for an anchor tag and then reading out
// the 'protocol' property.
if (Meteor.isClient) {
  var anchorForNormalization = document.createElement('A');
}

var getUrlProtocol = function (url) {
  if (Meteor.isClient) {
    anchorForNormalization.href = url;
    return (anchorForNormalization.protocol || "").toLowerCase();
  } else {
    throw new Error('getUrlProtocol not implemented on the server');
  }
};

// UrlHandler is an attribute handler for all HTML attributes that take
// URL values. It disallows javascript: URLs, unless
// Blaze._allowJavascriptUrls() has been called. To detect javascript:
// urls, we set the attribute on a dummy anchor element and then read
// out the 'protocol' property of the attribute.
var origUpdate = AttributeHandler.prototype.update;
var UrlHandler = AttributeHandler.extend({
  update: function (element, oldValue, value) {
    var self = this;
    var args = arguments;

    if (Blaze._javascriptUrlsAllowed()) {
      origUpdate.apply(self, args);
    } else {
      var isJavascriptProtocol = (getUrlProtocol(value) === "javascript:");
      if (isJavascriptProtocol) {
        Blaze._warn("URLs that use the 'javascript:' protocol are not " +
                    "allowed in URL attribute values. " +
                    "Call Blaze._allowJavascriptUrls() " +
                    "to enable them.");
        origUpdate.apply(self, [element, oldValue, null]);
      } else {
        origUpdate.apply(self, args);
      }
    }
  }
});

// XXX make it possible for users to register attribute handlers!
makeAttributeHandler = function (elem, name, value) {
  // generally, use setAttribute but certain attributes need to be set
  // by directly setting a JavaScript property on the DOM element.
  if (name === 'class') {
    if (isSVGElement(elem)) {
      return new SVGClassHandler(name, value);
    } else {
      return new ClassHandler(name, value);
    }
  } else if (name === 'style') {
    return new StyleHandler(name, value);
  } else if ((elem.tagName === 'OPTION' && name === 'selected') ||
             (elem.tagName === 'INPUT' && name === 'checked')) {
    return new BooleanHandler(name, value);
  } else if ((elem.tagName === 'TEXTAREA' || elem.tagName === 'INPUT')
             && name === 'value') {
    // internally, TEXTAREAs tracks their value in the 'value'
    // attribute just like INPUTs.
    return new ValueHandler(name, value);
  } else if (name.substring(0,6) === 'xlink:') {
    return new XlinkHandler(name.substring(6), value);
  } else if (isUrlAttribute(elem.tagName, name)) {
    return new UrlHandler(name, value);
  } else {
    return new AttributeHandler(name, value);
  }

  // XXX will need one for 'style' on IE, though modern browsers
  // seem to handle setAttribute ok.
};


ElementAttributesUpdater = function (elem) {
  this.elem = elem;
  this.handlers = {};
};

// Update attributes on `elem` to the dictionary `attrs`, whose
// values are strings.
ElementAttributesUpdater.prototype.update = function(newAttrs) {
  var elem = this.elem;
  var handlers = this.handlers;

  for (var k in handlers) {
    if (! _.has(newAttrs, k)) {
      // remove attributes (and handlers) for attribute names
      // that don't exist as keys of `newAttrs` and so won't
      // be visited when traversing it.  (Attributes that
      // exist in the `newAttrs` object but are `null`
      // are handled later.)
      var handler = handlers[k];
      var oldValue = handler.value;
      handler.value = null;
      handler.update(elem, oldValue, null);
      delete handlers[k];
    }
  }

  for (var k in newAttrs) {
    var handler = null;
    var oldValue;
    var value = newAttrs[k];
    if (! _.has(handlers, k)) {
      if (value !== null) {
        // make new handler
        handler = makeAttributeHandler(elem, k, value);
        handlers[k] = handler;
        oldValue = null;
      }
    } else {
      handler = handlers[k];
      oldValue = handler.value;
    }
    if (oldValue !== value) {
      handler.value = value;
      handler.update(elem, oldValue, value);
      if (value === null)
        delete handlers[k];
    }
  }
};
// new Blaze._DOMMaterializer(options)
//
// An HTML.Visitor that turns HTMLjs into DOM nodes and DOMRanges.
//
// Options: `parentView`
Blaze._DOMMaterializer = HTML.Visitor.extend();
Blaze._DOMMaterializer.def({
  visitNull: function (x, intoArray) {
    return intoArray;
  },
  visitPrimitive: function (primitive, intoArray) {
    var string = String(primitive);
    intoArray.push(document.createTextNode(string));
    return intoArray;
  },
  visitCharRef: function (charRef, intoArray) {
    return this.visitPrimitive(charRef.str, intoArray);
  },
  visitArray: function (array, intoArray) {
    for (var i = 0; i < array.length; i++)
      this.visit(array[i], intoArray);
    return intoArray;
  },
  visitComment: function (comment, intoArray) {
    intoArray.push(document.createComment(comment.sanitizedValue));
    return intoArray;
  },
  visitRaw: function (raw, intoArray) {
    // Get an array of DOM nodes by using the browser's HTML parser
    // (like innerHTML).
    var nodes = Blaze._DOMBackend.parseHTML(raw.value);
    for (var i = 0; i < nodes.length; i++)
      intoArray.push(nodes[i]);

    return intoArray;
  },
  visitTag: function (tag, intoArray) {
    var self = this;
    var tagName = tag.tagName;
    var elem;
    if ((HTML.isKnownSVGElement(tagName) || isSVGAnchor(tag))
        && document.createElementNS) {
      // inline SVG
      elem = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    } else {
      // normal elements
      elem = document.createElement(tagName);
    }

    var rawAttrs = tag.attrs;
    var children = tag.children;
    if (tagName === 'textarea' && tag.children.length &&
        ! (rawAttrs && ('value' in rawAttrs))) {
      // Provide very limited support for TEXTAREA tags with children
      // rather than a "value" attribute.
      // Reactivity in the form of Views nested in the tag's children
      // won't work.  Compilers should compile textarea contents into
      // the "value" attribute of the tag, wrapped in a function if there
      // is reactivity.
      if (typeof rawAttrs === 'function' ||
          HTML.isArray(rawAttrs)) {
        throw new Error("Can't have reactive children of TEXTAREA node; " +
                        "use the 'value' attribute instead.");
      }
      rawAttrs = _.extend({}, rawAttrs || null);
      rawAttrs.value = Blaze._expand(children, self.parentView);
      children = [];
    }

    if (rawAttrs) {
      var attrUpdater = new ElementAttributesUpdater(elem);
      var updateAttributes = function () {
        var parentView = self.parentView;
        var expandedAttrs = Blaze._expandAttributes(rawAttrs, parentView);
        var flattenedAttrs = HTML.flattenAttributes(expandedAttrs);
        var stringAttrs = {};
        for (var attrName in flattenedAttrs) {
          stringAttrs[attrName] = Blaze._toText(flattenedAttrs[attrName],
                                                parentView,
                                                HTML.TEXTMODE.STRING);
        }
        attrUpdater.update(stringAttrs);
      };
      var updaterComputation;
      if (self.parentView) {
        updaterComputation =
          self.parentView.autorun(updateAttributes, undefined, 'updater');
      } else {
        updaterComputation = Tracker.nonreactive(function () {
          return Tracker.autorun(function () {
            Tracker._withCurrentView(self.parentView, updateAttributes);
          });
        });
      }
      Blaze._DOMBackend.Teardown.onElementTeardown(elem, function attrTeardown() {
        updaterComputation.stop();
      });
    }

    var childNodesAndRanges = self.visit(children, []);
    for (var i = 0; i < childNodesAndRanges.length; i++) {
      var x = childNodesAndRanges[i];
      if (x instanceof Blaze._DOMRange)
        x.attach(elem);
      else
        elem.appendChild(x);
    }

    intoArray.push(elem);

    return intoArray;
  },
  visitObject: function (x, intoArray) {
    if (x instanceof Blaze.Template)
      x = x.constructView();

    if (x instanceof Blaze.View) {
      intoArray.push(Blaze._materializeView(x, this.parentView));
      return intoArray;
    }

    // throw the default error
    return HTML.Visitor.prototype.visitObject.call(this, x);
  }
});

var isSVGAnchor = function (node) {
  // We generally aren't able to detect SVG <a> elements because
  // if "A" were in our list of known svg element names, then all
  // <a> nodes would be created using
  // `document.createElementNS`. But in the special case of <a
  // xlink:href="...">, we can at least detect that attribute and
  // create an SVG <a> tag in that case.
  //
  // However, we still have a general problem of knowing when to
  // use document.createElementNS and when to use
  // document.createElement; for example, font tags will always
  // be created as SVG elements which can cause other
  // problems. #1977
  return (node.tagName === "a" &&
          node.attrs &&
          node.attrs["xlink:href"] !== undefined);
};
var debugFunc;

// We call into user code in many places, and it's nice to catch exceptions
// propagated from user code immediately so that the whole system doesn't just
// break.  Catching exceptions is easy; reporting them is hard.  This helper
// reports exceptions.
//
// Usage:
//
// ```
// try {
//   // ... someStuff ...
// } catch (e) {
//   reportUIException(e);
// }
// ```
//
// An optional second argument overrides the default message.

// Set this to `true` to cause `reportException` to throw
// the next exception rather than reporting it.  This is
// useful in unit tests that test error messages.
Blaze._throwNextException = false;

Blaze._reportException = function (e, msg) {
  if (Blaze._throwNextException) {
    Blaze._throwNextException = false;
    throw e;
  }

  if (! debugFunc)
    // adapted from Tracker
    debugFunc = function () {
      return (typeof Meteor !== "undefined" ? Meteor._debug :
              ((typeof console !== "undefined") && console.log ? console.log :
               function () {}));
    };

  // In Chrome, `e.stack` is a multiline string that starts with the message
  // and contains a stack trace.  Furthermore, `console.log` makes it clickable.
  // `console.log` supplies the space between the two arguments.
  debugFunc()(msg || 'Exception caught in template:', e.stack || e.message);
};

Blaze._wrapCatchingExceptions = function (f, where) {
  if (typeof f !== 'function')
    return f;

  return function () {
    try {
      return f.apply(this, arguments);
    } catch (e) {
      Blaze._reportException(e, 'Exception in ' + where + ':');
    }
  };
};
/// [new] Blaze.View([name], renderMethod)
///
/// Blaze.View is the building block of reactive DOM.  Views have
/// the following features:
///
/// * lifecycle callbacks - Views are created, rendered, and destroyed,
///   and callbacks can be registered to fire when these things happen.
///
/// * parent pointer - A View points to its parentView, which is the
///   View that caused it to be rendered.  These pointers form a
///   hierarchy or tree of Views.
///
/// * render() method - A View's render() method specifies the DOM
///   (or HTML) content of the View.  If the method establishes
///   reactive dependencies, it may be re-run.
///
/// * a DOMRange - If a View is rendered to DOM, its position and
///   extent in the DOM are tracked using a DOMRange object.
///
/// When a View is constructed by calling Blaze.View, the View is
/// not yet considered "created."  It doesn't have a parentView yet,
/// and no logic has been run to initialize the View.  All real
/// work is deferred until at least creation time, when the onViewCreated
/// callbacks are fired, which happens when the View is "used" in
/// some way that requires it to be rendered.
///
/// ...more lifecycle stuff
///
/// `name` is an optional string tag identifying the View.  The only
/// time it's used is when looking in the View tree for a View of a
/// particular name; for example, data contexts are stored on Views
/// of name "with".  Names are also useful when debugging, so in
/// general it's good for functions that create Views to set the name.
/// Views associated with templates have names of the form "Template.foo".

/**
 * @class
 * @summary Constructor for a View, which represents a reactive region of DOM.
 * @locus Client
 * @param {String} [name] Optional.  A name for this type of View.  See [`view.name`](#view_name).
 * @param {Function} renderFunction A function that returns [*renderable content*](#renderable_content).  In this function, `this` is bound to the View.
 */
Blaze.View = function (name, render) {
  if (! (this instanceof Blaze.View))
    // called without `new`
    return new Blaze.View(name, render);

  if (typeof name === 'function') {
    // omitted "name" argument
    render = name;
    name = '';
  }
  this.name = name;
  this._render = render;

  this._callbacks = {
    created: null,
    rendered: null,
    destroyed: null
  };

  // Setting all properties here is good for readability,
  // and also may help Chrome optimize the code by keeping
  // the View object from changing shape too much.
  this.isCreated = false;
  this._isCreatedForExpansion = false;
  this.isRendered = false;
  this._isAttached = false;
  this.isDestroyed = false;
  this._isInRender = false;
  this.parentView = null;
  this._domrange = null;
  // This flag is normally set to false except for the cases when view's parent
  // was generated as part of expanding some syntactic sugar expressions or
  // methods.
  // Ex.: Blaze.renderWithData is an equivalent to creating a view with regular
  // Blaze.render and wrapping it into {{#with data}}{{/with}} view. Since the
  // users don't know anything about these generated parent views, Blaze needs
  // this information to be available on views to make smarter decisions. For
  // example: removing the generated parent view with the view on Blaze.remove.
  this._hasGeneratedParent = false;

  this.renderCount = 0;
};

Blaze.View.prototype._render = function () { return null; };

Blaze.View.prototype.onViewCreated = function (cb) {
  this._callbacks.created = this._callbacks.created || [];
  this._callbacks.created.push(cb);
};

Blaze.View.prototype._onViewRendered = function (cb) {
  this._callbacks.rendered = this._callbacks.rendered || [];
  this._callbacks.rendered.push(cb);
};

Blaze.View.prototype.onViewReady = function (cb) {
  var self = this;
  var fire = function () {
    Tracker.afterFlush(function () {
      if (! self.isDestroyed) {
        Blaze._withCurrentView(self, function () {
          cb.call(self);
        });
      }
    });
  };
  self._onViewRendered(function onViewRendered() {
    if (self.isDestroyed)
      return;
    if (! self._domrange.attached)
      self._domrange.onAttached(fire);
    else
      fire();
  });
};

Blaze.View.prototype.onViewDestroyed = function (cb) {
  this._callbacks.destroyed = this._callbacks.destroyed || [];
  this._callbacks.destroyed.push(cb);
};

/// View#autorun(func)
///
/// Sets up a Tracker autorun that is "scoped" to this View in two
/// important ways: 1) Blaze.currentView is automatically set
/// on every re-run, and 2) the autorun is stopped when the
/// View is destroyed.  As with Tracker.autorun, the first run of
/// the function is immediate, and a Computation object that can
/// be used to stop the autorun is returned.
///
/// View#autorun is meant to be called from View callbacks like
/// onViewCreated, or from outside the rendering process.  It may not
/// be called before the onViewCreated callbacks are fired (too early),
/// or from a render() method (too confusing).
///
/// Typically, autoruns that update the state
/// of the View (as in Blaze.With) should be started from an onViewCreated
/// callback.  Autoruns that update the DOM should be started
/// from either onViewCreated (guarded against the absence of
/// view._domrange), or onViewReady.
Blaze.View.prototype.autorun = function (f, _inViewScope, displayName) {
  var self = this;

  // The restrictions on when View#autorun can be called are in order
  // to avoid bad patterns, like creating a Blaze.View and immediately
  // calling autorun on it.  A freshly created View is not ready to
  // have logic run on it; it doesn't have a parentView, for example.
  // It's when the View is materialized or expanded that the onViewCreated
  // handlers are fired and the View starts up.
  //
  // Letting the render() method call `this.autorun()` is problematic
  // because of re-render.  The best we can do is to stop the old
  // autorun and start a new one for each render, but that's a pattern
  // we try to avoid internally because it leads to helpers being
  // called extra times, in the case where the autorun causes the
  // view to re-render (and thus the autorun to be torn down and a
  // new one established).
  //
  // We could lift these restrictions in various ways.  One interesting
  // idea is to allow you to call `view.autorun` after instantiating
  // `view`, and automatically wrap it in `view.onViewCreated`, deferring
  // the autorun so that it starts at an appropriate time.  However,
  // then we can't return the Computation object to the caller, because
  // it doesn't exist yet.
  if (! self.isCreated) {
    throw new Error("View#autorun must be called from the created callback at the earliest");
  }
  if (this._isInRender) {
    throw new Error("Can't call View#autorun from inside render(); try calling it from the created or rendered callback");
  }
  if (Tracker.active) {
    throw new Error("Can't call View#autorun from a Tracker Computation; try calling it from the created or rendered callback");
  }

  // Each local variable allocate additional space on each frame of the
  // execution stack. When too many variables are allocated on stack, you can
  // run out of memory on stack running a deep recursion (which is typical for
  // Blaze functions) and get stackoverlow error. (The size of the stack varies
  // between browsers).
  // The trick we use here is to allocate only one variable on stack `locals`
  // that keeps references to all the rest. Since locals is allocated on heap,
  // we don't take up any space on the stack.
  var locals = {};
  locals.templateInstanceFunc = Blaze.Template._currentTemplateInstanceFunc;

  locals.f = function viewAutorun(c) {
    return Blaze._withCurrentView(_inViewScope || self, function () {
      return Blaze.Template._withTemplateInstanceFunc(locals.templateInstanceFunc, function () {
        return f.call(self, c);
      });
    });
  };

  // Give the autorun function a better name for debugging and profiling.
  // The `displayName` property is not part of the spec but browsers like Chrome
  // and Firefox prefer it in debuggers over the name function was declared by.
  locals.f.displayName =
    (self.name || 'anonymous') + ':' + (displayName || 'anonymous');
  locals.c = Tracker.autorun(locals.f);

  self.onViewDestroyed(function () { locals.c.stop(); });

  return locals.c;
};

Blaze.View.prototype._errorIfShouldntCallSubscribe = function () {
  var self = this;

  if (! self.isCreated) {
    throw new Error("View#subscribe must be called from the created callback at the earliest");
  }
  if (self._isInRender) {
    throw new Error("Can't call View#subscribe from inside render(); try calling it from the created or rendered callback");
  }
  if (self.isDestroyed) {
    throw new Error("Can't call View#subscribe from inside the destroyed callback, try calling it inside created or rendered.");
  }
};

/**
 * Just like Blaze.View#autorun, but with Meteor.subscribe instead of
 * Tracker.autorun. Stop the subscription when the view is destroyed.
 * @return {SubscriptionHandle} A handle to the subscription so that you can
 * see if it is ready, or stop it manually
 */
Blaze.View.prototype.subscribe = function (args, options) {
  var self = this;
  options = {} || options;

  self._errorIfShouldntCallSubscribe();

  var subHandle;
  if (options.connection) {
    subHandle = options.connection.subscribe.apply(options.connection, args);
  } else {
    subHandle = Meteor.subscribe.apply(Meteor, args);
  }

  self.onViewDestroyed(function () {
    subHandle.stop();
  });

  return subHandle;
};

Blaze.View.prototype.firstNode = function () {
  if (! this._isAttached)
    throw new Error("View must be attached before accessing its DOM");

  return this._domrange.firstNode();
};

Blaze.View.prototype.lastNode = function () {
  if (! this._isAttached)
    throw new Error("View must be attached before accessing its DOM");

  return this._domrange.lastNode();
};

Blaze._fireCallbacks = function (view, which) {
  Blaze._withCurrentView(view, function () {
    Tracker.nonreactive(function fireCallbacks() {
      var cbs = view._callbacks[which];
      for (var i = 0, N = (cbs && cbs.length); i < N; i++)
        cbs[i].call(view);
    });
  });
};

Blaze._createView = function (view, parentView, forExpansion) {
  if (view.isCreated)
    throw new Error("Can't render the same View twice");

  view.parentView = (parentView || null);
  view.isCreated = true;
  if (forExpansion)
    view._isCreatedForExpansion = true;

  Blaze._fireCallbacks(view, 'created');
};

Blaze._materializeView = function (view, parentView) {
  Blaze._createView(view, parentView);

  var domrange;
  var lastHtmljs;
  // We don't expect to be called in a Computation, but just in case,
  // wrap in Tracker.nonreactive.
  Tracker.nonreactive(function () {
    view.autorun(function doRender(c) {
      // `view.autorun` sets the current view.
      view.renderCount++;
      view._isInRender = true;
      // Any dependencies that should invalidate this Computation come
      // from this line:
      var htmljs = view._render();
      view._isInRender = false;

      Tracker.nonreactive(function doMaterialize() {
        var materializer = new Blaze._DOMMaterializer({parentView: view});
        var rangesAndNodes = materializer.visit(htmljs, []);
        if (c.firstRun || ! Blaze._isContentEqual(lastHtmljs, htmljs)) {
          if (c.firstRun) {
            domrange = new Blaze._DOMRange(rangesAndNodes);
            view._domrange = domrange;
            domrange.view = view;
            view.isRendered = true;
          } else {
            domrange.setMembers(rangesAndNodes);
          }
          Blaze._fireCallbacks(view, 'rendered');
        }
      });
      lastHtmljs = htmljs;

      // Causes any nested views to stop immediately, not when we call
      // `setMembers` the next time around the autorun.  Otherwise,
      // helpers in the DOM tree to be replaced might be scheduled
      // to re-run before we have a chance to stop them.
      Tracker.onInvalidate(function () {
        domrange.destroyMembers();
      });
    }, undefined, ':materialize');

    var teardownHook = null;

    domrange.onAttached(function attached(range, element) {
      view._isAttached = true;

      teardownHook = Blaze._DOMBackend.Teardown.onElementTeardown(
        element, function teardown() {
          Blaze._destroyView(view, true /* _skipNodes */);
        });
    });

    // tear down the teardown hook
    view.onViewDestroyed(function () {
      teardownHook && teardownHook.stop();
      teardownHook = null;
    });
  });

  return domrange;
};

// Expands a View to HTMLjs, calling `render` recursively on all
// Views and evaluating any dynamic attributes.  Calls the `created`
// callback, but not the `materialized` or `rendered` callbacks.
// Destroys the view immediately, unless called in a Tracker Computation,
// in which case the view will be destroyed when the Computation is
// invalidated.  If called in a Tracker Computation, the result is a
// reactive string; that is, the Computation will be invalidated
// if any changes are made to the view or subviews that might affect
// the HTML.
Blaze._expandView = function (view, parentView) {
  Blaze._createView(view, parentView, true /*forExpansion*/);

  view._isInRender = true;
  var htmljs = Blaze._withCurrentView(view, function () {
    return view._render();
  });
  view._isInRender = false;

  var result = Blaze._expand(htmljs, view);

  if (Tracker.active) {
    Tracker.onInvalidate(function () {
      Blaze._destroyView(view);
    });
  } else {
    Blaze._destroyView(view);
  }

  return result;
};

// Options: `parentView`
Blaze._HTMLJSExpander = HTML.TransformingVisitor.extend();
Blaze._HTMLJSExpander.def({
  visitObject: function (x) {
    if (x instanceof Blaze.Template)
      x = x.constructView();
    if (x instanceof Blaze.View)
      return Blaze._expandView(x, this.parentView);

    // this will throw an error; other objects are not allowed!
    return HTML.TransformingVisitor.prototype.visitObject.call(this, x);
  },
  visitAttributes: function (attrs) {
    // expand dynamic attributes
    if (typeof attrs === 'function')
      attrs = Blaze._withCurrentView(this.parentView, attrs);

    // call super (e.g. for case where `attrs` is an array)
    return HTML.TransformingVisitor.prototype.visitAttributes.call(this, attrs);
  },
  visitAttribute: function (name, value, tag) {
    // expand attribute values that are functions.  Any attribute value
    // that contains Views must be wrapped in a function.
    if (typeof value === 'function')
      value = Blaze._withCurrentView(this.parentView, value);

    return HTML.TransformingVisitor.prototype.visitAttribute.call(
      this, name, value, tag);
  }
});

// Return Blaze.currentView, but only if it is being rendered
// (i.e. we are in its render() method).
var currentViewIfRendering = function () {
  var view = Blaze.currentView;
  return (view && view._isInRender) ? view : null;
};

Blaze._expand = function (htmljs, parentView) {
  parentView = parentView || currentViewIfRendering();
  return (new Blaze._HTMLJSExpander(
    {parentView: parentView})).visit(htmljs);
};

Blaze._expandAttributes = function (attrs, parentView) {
  parentView = parentView || currentViewIfRendering();
  return (new Blaze._HTMLJSExpander(
    {parentView: parentView})).visitAttributes(attrs);
};

Blaze._destroyView = function (view, _skipNodes) {
  if (view.isDestroyed)
    return;
  view.isDestroyed = true;

  Blaze._fireCallbacks(view, 'destroyed');

  // Destroy views and elements recursively.  If _skipNodes,
  // only recurse up to views, not elements, for the case where
  // the backend (jQuery) is recursing over the elements already.

  if (view._domrange)
    view._domrange.destroyMembers(_skipNodes);
};

Blaze._destroyNode = function (node) {
  if (node.nodeType === 1)
    Blaze._DOMBackend.Teardown.tearDownElement(node);
};

// Are the HTMLjs entities `a` and `b` the same?  We could be
// more elaborate here but the point is to catch the most basic
// cases.
Blaze._isContentEqual = function (a, b) {
  if (a instanceof HTML.Raw) {
    return (b instanceof HTML.Raw) && (a.value === b.value);
  } else if (a == null) {
    return (b == null);
  } else {
    return (a === b) &&
      ((typeof a === 'number') || (typeof a === 'boolean') ||
       (typeof a === 'string'));
  }
};

/**
 * @summary The View corresponding to the current template helper, event handler, callback, or autorun.  If there isn't one, `null`.
 * @locus Client
 * @type {Blaze.View}
 */
Blaze.currentView = null;

Blaze._withCurrentView = function (view, func) {
  var oldView = Blaze.currentView;
  try {
    Blaze.currentView = view;
    return func();
  } finally {
    Blaze.currentView = oldView;
  }
};

// Blaze.render publicly takes a View or a Template.
// Privately, it takes any HTMLJS (extended with Views and Templates)
// except null or undefined, or a function that returns any extended
// HTMLJS.
var checkRenderContent = function (content) {
  if (content === null)
    throw new Error("Can't render null");
  if (typeof content === 'undefined')
    throw new Error("Can't render undefined");

  if ((content instanceof Blaze.View) ||
      (content instanceof Blaze.Template) ||
      (typeof content === 'function'))
    return;

  try {
    // Throw if content doesn't look like HTMLJS at the top level
    // (i.e. verify that this is an HTML.Tag, or an array,
    // or a primitive, etc.)
    (new HTML.Visitor).visit(content);
  } catch (e) {
    // Make error message suitable for public API
    throw new Error("Expected Template or View");
  }
};

// For Blaze.render and Blaze.toHTML, take content and
// wrap it in a View, unless it's a single View or
// Template already.
var contentAsView = function (content) {
  checkRenderContent(content);

  if (content instanceof Blaze.Template) {
    return content.constructView();
  } else if (content instanceof Blaze.View) {
    return content;
  } else {
    var func = content;
    if (typeof func !== 'function') {
      func = function () {
        return content;
      };
    }
    return Blaze.View('render', func);
  }
};

// For Blaze.renderWithData and Blaze.toHTMLWithData, wrap content
// in a function, if necessary, so it can be a content arg to
// a Blaze.With.
var contentAsFunc = function (content) {
  checkRenderContent(content);

  if (typeof content !== 'function') {
    return function () {
      return content;
    };
  } else {
    return content;
  }
};

/**
 * @summary Renders a template or View to DOM nodes and inserts it into the DOM, returning a rendered [View](#blaze_view) which can be passed to [`Blaze.remove`](#blaze_remove).
 * @locus Client
 * @param {Template|Blaze.View} templateOrView The template (e.g. `Template.myTemplate`) or View object to render.  If a template, a View object is [constructed](#template_constructview).  If a View, it must be an unrendered View, which becomes a rendered View and is returned.
 * @param {DOMNode} parentNode The node that will be the parent of the rendered template.  It must be an Element node.
 * @param {DOMNode} [nextNode] Optional. If provided, must be a child of <em>parentNode</em>; the template will be inserted before this node. If not provided, the template will be inserted as the last child of parentNode.
 * @param {Blaze.View} [parentView] Optional. If provided, it will be set as the rendered View's [`parentView`](#view_parentview).
 */
Blaze.render = function (content, parentElement, nextNode, parentView) {
  if (! parentElement) {
    Blaze._warn("Blaze.render without a parent element is deprecated. " +
                "You must specify where to insert the rendered content.");
  }

  if (nextNode instanceof Blaze.View) {
    // handle omitted nextNode
    parentView = nextNode;
    nextNode = null;
  }

  // parentElement must be a DOM node. in particular, can't be the
  // result of a call to `$`. Can't check if `parentElement instanceof
  // Node` since 'Node' is undefined in IE8.
  if (parentElement && typeof parentElement.nodeType !== 'number')
    throw new Error("'parentElement' must be a DOM node");
  if (nextNode && typeof nextNode.nodeType !== 'number') // 'nextNode' is optional
    throw new Error("'nextNode' must be a DOM node");

  parentView = parentView || currentViewIfRendering();

  var view = contentAsView(content);
  Blaze._materializeView(view, parentView);

  if (parentElement) {
    view._domrange.attach(parentElement, nextNode);
  }

  return view;
};

Blaze.insert = function (view, parentElement, nextNode) {
  Blaze._warn("Blaze.insert has been deprecated.  Specify where to insert the " +
              "rendered content in the call to Blaze.render.");

  if (! (view && (view._domrange instanceof Blaze._DOMRange)))
    throw new Error("Expected template rendered with Blaze.render");

  view._domrange.attach(parentElement, nextNode);
};

/**
 * @summary Renders a template or View to DOM nodes with a data context.  Otherwise identical to `Blaze.render`.
 * @locus Client
 * @param {Template|Blaze.View} templateOrView The template (e.g. `Template.myTemplate`) or View object to render.
 * @param {Object|Function} data The data context to use, or a function returning a data context.  If a function is provided, it will be reactively re-run.
 * @param {DOMNode} parentNode The node that will be the parent of the rendered template.  It must be an Element node.
 * @param {DOMNode} [nextNode] Optional. If provided, must be a child of <em>parentNode</em>; the template will be inserted before this node. If not provided, the template will be inserted as the last child of parentNode.
 * @param {Blaze.View} [parentView] Optional. If provided, it will be set as the rendered View's [`parentView`](#view_parentview).
 */
Blaze.renderWithData = function (content, data, parentElement, nextNode, parentView) {
  // We defer the handling of optional arguments to Blaze.render.  At this point,
  // `nextNode` may actually be `parentView`.
  return Blaze.render(Blaze._TemplateWith(data, contentAsFunc(content)),
                          parentElement, nextNode, parentView);
};

/**
 * @summary Removes a rendered View from the DOM, stopping all reactive updates and event listeners on it.
 * @locus Client
 * @param {Blaze.View} renderedView The return value from `Blaze.render` or `Blaze.renderWithData`.
 */
Blaze.remove = function (view) {
  if (! (view && (view._domrange instanceof Blaze._DOMRange)))
    throw new Error("Expected template rendered with Blaze.render");

  while (view) {
    if (! view.isDestroyed) {
      var range = view._domrange;
      if (range.attached && ! range.parentRange)
        range.detach();
      range.destroy();
    }

    view = view._hasGeneratedParent && view.parentView;
  }
};

/**
 * @summary Renders a template or View to a string of HTML.
 * @locus Client
 * @param {Template|Blaze.View} templateOrView The template (e.g. `Template.myTemplate`) or View object from which to generate HTML.
 */
Blaze.toHTML = function (content, parentView) {
  parentView = parentView || currentViewIfRendering();

  return HTML.toHTML(Blaze._expandView(contentAsView(content), parentView));
};

/**
 * @summary Renders a template or View to HTML with a data context.  Otherwise identical to `Blaze.toHTML`.
 * @locus Client
 * @param {Template|Blaze.View} templateOrView The template (e.g. `Template.myTemplate`) or View object from which to generate HTML.
 * @param {Object|Function} data The data context to use, or a function returning a data context.
 */
Blaze.toHTMLWithData = function (content, data, parentView) {
  parentView = parentView || currentViewIfRendering();

  return HTML.toHTML(Blaze._expandView(Blaze._TemplateWith(
    data, contentAsFunc(content)), parentView));
};

Blaze._toText = function (htmljs, parentView, textMode) {
  if (typeof htmljs === 'function')
    throw new Error("Blaze._toText doesn't take a function, just HTMLjs");

  if ((parentView != null) && ! (parentView instanceof Blaze.View)) {
    // omitted parentView argument
    textMode = parentView;
    parentView = null;
  }
  parentView = parentView || currentViewIfRendering();

  if (! textMode)
    throw new Error("textMode required");
  if (! (textMode === HTML.TEXTMODE.STRING ||
         textMode === HTML.TEXTMODE.RCDATA ||
         textMode === HTML.TEXTMODE.ATTRIBUTE))
    throw new Error("Unknown textMode: " + textMode);

  return HTML.toText(Blaze._expand(htmljs, parentView), textMode);
};

/**
 * @summary Returns the current data context, or the data context that was used when rendering a particular DOM element or View from a Meteor template.
 * @locus Client
 * @param {DOMElement|Blaze.View} [elementOrView] Optional.  An element that was rendered by a Meteor, or a View.
 */
Blaze.getData = function (elementOrView) {
  var theWith;

  if (! elementOrView) {
    theWith = Blaze.getView('with');
  } else if (elementOrView instanceof Blaze.View) {
    var view = elementOrView;
    theWith = (view.name === 'with' ? view :
               Blaze.getView(view, 'with'));
  } else if (typeof elementOrView.nodeType === 'number') {
    if (elementOrView.nodeType !== 1)
      throw new Error("Expected DOM element");
    theWith = Blaze.getView(elementOrView, 'with');
  } else {
    throw new Error("Expected DOM element or View");
  }

  return theWith ? theWith.dataVar.get() : null;
};

// For back-compat
Blaze.getElementData = function (element) {
  Blaze._warn("Blaze.getElementData has been deprecated.  Use " +
              "Blaze.getData(element) instead.");

  if (element.nodeType !== 1)
    throw new Error("Expected DOM element");

  return Blaze.getData(element);
};

// Both arguments are optional.

/**
 * @summary Gets either the current View, or the View enclosing the given DOM element.
 * @locus Client
 * @param {DOMElement} [element] Optional.  If specified, the View enclosing `element` is returned.
 */
Blaze.getView = function (elementOrView, _viewName) {
  var viewName = _viewName;

  if ((typeof elementOrView) === 'string') {
    // omitted elementOrView; viewName present
    viewName = elementOrView;
    elementOrView = null;
  }

  // We could eventually shorten the code by folding the logic
  // from the other methods into this method.
  if (! elementOrView) {
    return Blaze._getCurrentView(viewName);
  } else if (elementOrView instanceof Blaze.View) {
    return Blaze._getParentView(elementOrView, viewName);
  } else if (typeof elementOrView.nodeType === 'number') {
    return Blaze._getElementView(elementOrView, viewName);
  } else {
    throw new Error("Expected DOM element or View");
  }
};

// Gets the current view or its nearest ancestor of name
// `name`.
Blaze._getCurrentView = function (name) {
  var view = Blaze.currentView;
  // Better to fail in cases where it doesn't make sense
  // to use Blaze._getCurrentView().  There will be a current
  // view anywhere it does.  You can check Blaze.currentView
  // if you want to know whether there is one or not.
  if (! view)
    throw new Error("There is no current view");

  if (name) {
    while (view && view.name !== name)
      view = view.parentView;
    return view || null;
  } else {
    // Blaze._getCurrentView() with no arguments just returns
    // Blaze.currentView.
    return view;
  }
};

Blaze._getParentView = function (view, name) {
  var v = view.parentView;

  if (name) {
    while (v && v.name !== name)
      v = v.parentView;
  }

  return v || null;
};

Blaze._getElementView = function (elem, name) {
  var range = Blaze._DOMRange.forElement(elem);
  var view = null;
  while (range && ! view) {
    view = (range.view || null);
    if (! view) {
      if (range.parentRange)
        range = range.parentRange;
      else
        range = Blaze._DOMRange.forElement(range.parentElement);
    }
  }

  if (name) {
    while (view && view.name !== name)
      view = view.parentView;
    return view || null;
  } else {
    return view;
  }
};

Blaze._addEventMap = function (view, eventMap, thisInHandler) {
  thisInHandler = (thisInHandler || null);
  var handles = [];

  if (! view._domrange)
    throw new Error("View must have a DOMRange");

  view._domrange.onAttached(function attached_eventMaps(range, element) {
    _.each(eventMap, function (handler, spec) {
      var clauses = spec.split(/,\s+/);
      // iterate over clauses of spec, e.g. ['click .foo', 'click .bar']
      _.each(clauses, function (clause) {
        var parts = clause.split(/\s+/);
        if (parts.length === 0)
          return;

        var newEvents = parts.shift();
        var selector = parts.join(' ');
        handles.push(Blaze._EventSupport.listen(
          element, newEvents, selector,
          function (evt) {
            if (! range.containsElement(evt.currentTarget))
              return null;
            var handlerThis = thisInHandler || this;
            var handlerArgs = arguments;
            return Blaze._withCurrentView(Blaze.getView(evt.currentTarget),
              function () {
                return handler.apply(handlerThis, handlerArgs);
              });
          },
          range, function (r) {
            return r.parentRange;
          }));
      });
    });
  });

  view.onViewDestroyed(function () {
    _.each(handles, function (h) {
      h.stop();
    });
    handles.length = 0;
  });
};
Blaze._calculateCondition = function (cond) {
  if (cond instanceof Array && cond.length === 0)
    cond = false;
  return !! cond;
};

/**
 * @summary Constructs a View that renders content with a data context.
 * @locus Client
 * @param {Object|Function} data An object to use as the data context, or a function returning such an object.  If a function is provided, it will be reactively re-run.
 * @param {Function} contentFunc A Function that returns [*renderable content*](#renderable_content).
 */
Blaze.With = function (data, contentFunc) {
  var view = Blaze.View('with', contentFunc);

  view.dataVar = new ReactiveVar;

  view.onViewCreated(function () {
    if (typeof data === 'function') {
      // `data` is a reactive function
      view.autorun(function () {
        view.dataVar.set(data());
      }, view.parentView, 'setData');
    } else {
      view.dataVar.set(data);
    }
  });

  return view;
};

/**
 * @summary Constructs a View that renders content conditionally.
 * @locus Client
 * @param {Function} conditionFunc A function to reactively re-run.  Whether the result is truthy or falsy determines whether `contentFunc` or `elseFunc` is shown.  An empty array is considered falsy.
 * @param {Function} contentFunc A Function that returns [*renderable content*](#renderable_content).
 * @param {Function} [elseFunc] Optional.  A Function that returns [*renderable content*](#renderable_content).  If no `elseFunc` is supplied, no content is shown in the "else" case.
 */
Blaze.If = function (conditionFunc, contentFunc, elseFunc, _not) {
  var conditionVar = new ReactiveVar;

  var view = Blaze.View(_not ? 'unless' : 'if', function () {
    return conditionVar.get() ? contentFunc() :
      (elseFunc ? elseFunc() : null);
  });
  view.__conditionVar = conditionVar;
  view.onViewCreated(function () {
    this.autorun(function () {
      var cond = Blaze._calculateCondition(conditionFunc());
      conditionVar.set(_not ? (! cond) : cond);
    }, this.parentView, 'condition');
  });

  return view;
};

/**
 * @summary An inverted [`Blaze.If`](#blaze_if).
 * @locus Client
 * @param {Function} conditionFunc A function to reactively re-run.  If the result is falsy, `contentFunc` is shown, otherwise `elseFunc` is shown.  An empty array is considered falsy.
 * @param {Function} contentFunc A Function that returns [*renderable content*](#renderable_content).
 * @param {Function} [elseFunc] Optional.  A Function that returns [*renderable content*](#renderable_content).  If no `elseFunc` is supplied, no content is shown in the "else" case.
 */
Blaze.Unless = function (conditionFunc, contentFunc, elseFunc) {
  return Blaze.If(conditionFunc, contentFunc, elseFunc, true /*_not*/);
};

/**
 * @summary Constructs a View that renders `contentFunc` for each item in a sequence.
 * @locus Client
 * @param {Function} argFunc A function to reactively re-run.  The function may return a Cursor, an array, null, or undefined.
 * @param {Function} contentFunc A Function that returns [*renderable content*](#renderable_content).
 * @param {Function} [elseFunc] Optional.  A Function that returns [*renderable content*](#renderable_content) to display in the case when there are no items to display.
 */
Blaze.Each = function (argFunc, contentFunc, elseFunc) {
  var eachView = Blaze.View('each', function () {
    var subviews = this.initialSubviews;
    this.initialSubviews = null;
    if (this._isCreatedForExpansion) {
      this.expandedValueDep = new Tracker.Dependency;
      this.expandedValueDep.depend();
    }
    return subviews;
  });
  eachView.initialSubviews = [];
  eachView.numItems = 0;
  eachView.inElseMode = false;
  eachView.stopHandle = null;
  eachView.contentFunc = contentFunc;
  eachView.elseFunc = elseFunc;
  eachView.argVar = new ReactiveVar;

  eachView.onViewCreated(function () {
    // We evaluate argFunc in an autorun to make sure
    // Blaze.currentView is always set when it runs (rather than
    // passing argFunc straight to ObserveSequence).
    eachView.autorun(function () {
      eachView.argVar.set(argFunc());
    }, eachView.parentView, 'collection');

    eachView.stopHandle = ObserveSequence.observe(function () {
      return eachView.argVar.get();
    }, {
      addedAt: function (id, item, index) {
        Tracker.nonreactive(function () {
          var newItemView = Blaze.With(item, eachView.contentFunc);
          eachView.numItems++;

          if (eachView.expandedValueDep) {
            eachView.expandedValueDep.changed();
          } else if (eachView._domrange) {
            if (eachView.inElseMode) {
              eachView._domrange.removeMember(0);
              eachView.inElseMode = false;
            }

            var range = Blaze._materializeView(newItemView, eachView);
            eachView._domrange.addMember(range, index);
          } else {
            eachView.initialSubviews.splice(index, 0, newItemView);
          }
        });
      },
      removedAt: function (id, item, index) {
        Tracker.nonreactive(function () {
          eachView.numItems--;
          if (eachView.expandedValueDep) {
            eachView.expandedValueDep.changed();
          } else if (eachView._domrange) {
            eachView._domrange.removeMember(index);
            if (eachView.elseFunc && eachView.numItems === 0) {
              eachView.inElseMode = true;
              eachView._domrange.addMember(
                Blaze._materializeView(
                  Blaze.View('each_else',eachView.elseFunc),
                  eachView), 0);
            }
          } else {
            eachView.initialSubviews.splice(index, 1);
          }
        });
      },
      changedAt: function (id, newItem, oldItem, index) {
        Tracker.nonreactive(function () {
          var itemView;
          if (eachView.expandedValueDep) {
            eachView.expandedValueDep.changed();
          } else if (eachView._domrange) {
            itemView = eachView._domrange.getMember(index).view;
          } else {
            itemView = eachView.initialSubviews[index];
          }
          itemView.dataVar.set(newItem);
        });
      },
      movedTo: function (id, item, fromIndex, toIndex) {
        Tracker.nonreactive(function () {
          if (eachView.expandedValueDep) {
            eachView.expandedValueDep.changed();
          } else if (eachView._domrange) {
            eachView._domrange.moveMember(fromIndex, toIndex);
          } else {
            var subviews = eachView.initialSubviews;
            var itemView = subviews[fromIndex];
            subviews.splice(fromIndex, 1);
            subviews.splice(toIndex, 0, itemView);
          }
        });
      }
    });

    if (eachView.elseFunc && eachView.numItems === 0) {
      eachView.inElseMode = true;
      eachView.initialSubviews[0] =
        Blaze.View('each_else', eachView.elseFunc);
    }
  });

  eachView.onViewDestroyed(function () {
    if (eachView.stopHandle)
      eachView.stopHandle.stop();
  });

  return eachView;
};

Blaze._TemplateWith = function (arg, contentFunc) {
  var w;

  var argFunc = arg;
  if (typeof arg !== 'function') {
    argFunc = function () {
      return arg;
    };
  }

  // This is a little messy.  When we compile `{{> Template.contentBlock}}`, we
  // wrap it in Blaze._InOuterTemplateScope in order to skip the intermediate
  // parent Views in the current template.  However, when there's an argument
  // (`{{> Template.contentBlock arg}}`), the argument needs to be evaluated
  // in the original scope.  There's no good order to nest
  // Blaze._InOuterTemplateScope and Spacebars.TemplateWith to achieve this,
  // so we wrap argFunc to run it in the "original parentView" of the
  // Blaze._InOuterTemplateScope.
  //
  // To make this better, reconsider _InOuterTemplateScope as a primitive.
  // Longer term, evaluate expressions in the proper lexical scope.
  var wrappedArgFunc = function () {
    var viewToEvaluateArg = null;
    if (w.parentView && w.parentView.name === 'InOuterTemplateScope') {
      viewToEvaluateArg = w.parentView.originalParentView;
    }
    if (viewToEvaluateArg) {
      return Blaze._withCurrentView(viewToEvaluateArg, argFunc);
    } else {
      return argFunc();
    }
  };

  var wrappedContentFunc = function () {
    var content = contentFunc.call(this);

    // Since we are generating the Blaze._TemplateWith view for the
    // user, set the flag on the child view.  If `content` is a template,
    // construct the View so that we can set the flag.
    if (content instanceof Blaze.Template) {
      content = content.constructView();
    }
    if (content instanceof Blaze.View) {
      content._hasGeneratedParent = true;
    }

    return content;
  };

  w = Blaze.With(wrappedArgFunc, wrappedContentFunc);
  w.__isTemplateWith = true;
  return w;
};

Blaze._InOuterTemplateScope = function (templateView, contentFunc) {
  var view = Blaze.View('InOuterTemplateScope', contentFunc);
  var parentView = templateView.parentView;

  // Hack so that if you call `{{> foo bar}}` and it expands into
  // `{{#with bar}}{{> foo}}{{/with}}`, and then `foo` is a template
  // that inserts `{{> Template.contentBlock}}`, the data context for
  // `Template.contentBlock` is not `bar` but the one enclosing that.
  if (parentView.__isTemplateWith)
    parentView = parentView.parentView;

  view.onViewCreated(function () {
    this.originalParentView = this.parentView;
    this.parentView = parentView;
  });
  return view;
};

// XXX COMPAT WITH 0.9.0
Blaze.InOuterTemplateScope = Blaze._InOuterTemplateScope;
Blaze._globalHelpers = {};

// Documented as Template.registerHelper.
// This definition also provides back-compat for `UI.registerHelper`.
Blaze.registerHelper = function (name, func) {
  Blaze._globalHelpers[name] = func;
};

var bindIfIsFunction = function (x, target) {
  if (typeof x !== 'function')
    return x;
  return _.bind(x, target);
};

// If `x` is a function, binds the value of `this` for that function
// to the current data context.
var bindDataContext = function (x) {
  if (typeof x === 'function') {
    return function () {
      var data = Blaze.getData();
      if (data == null)
        data = {};
      return x.apply(data, arguments);
    };
  }
  return x;
};

Blaze._OLDSTYLE_HELPER = {};

var getTemplateHelper = Blaze._getTemplateHelper = function (template, name) {
  // XXX COMPAT WITH 0.9.3
  var isKnownOldStyleHelper = false;

  if (template.__helpers.has(name)) {
    var helper = template.__helpers.get(name);
    if (helper === Blaze._OLDSTYLE_HELPER) {
      isKnownOldStyleHelper = true;
    } else {
      return helper;
    }
  }

  // old-style helper
  if (name in template) {
    // Only warn once per helper
    if (! isKnownOldStyleHelper) {
      template.__helpers.set(name, Blaze._OLDSTYLE_HELPER);
      if (! template._NOWARN_OLDSTYLE_HELPERS) {
        Blaze._warn('Assigning helper with `' + template.viewName + '.' +
                    name + ' = ...` is deprecated.  Use `' + template.viewName +
                    '.helpers(...)` instead.');
      }
    }
    return template[name];
  }

  return null;
};

var wrapHelper = function (f, templateFunc) {
  if (typeof f !== "function") {
    return f;
  }

  return function () {
    var self = this;
    var args = arguments;

    return Template._withTemplateInstanceFunc(templateFunc, function () {
      return Blaze._wrapCatchingExceptions(f, 'template helper').apply(self, args);
    });
  };
};

// Looks up a name, like "foo" or "..", as a helper of the
// current template; a global helper; the name of a template;
// or a property of the data context.  Called on the View of
// a template (i.e. a View with a `.template` property,
// where the helpers are).  Used for the first name in a
// "path" in a template tag, like "foo" in `{{foo.bar}}` or
// ".." in `{{frobulate ../blah}}`.
//
// Returns a function, a non-function value, or null.  If
// a function is found, it is bound appropriately.
//
// NOTE: This function must not establish any reactive
// dependencies itself.  If there is any reactivity in the
// value, lookup should return a function.
Blaze.View.prototype.lookup = function (name, _options) {
  var template = this.template;
  var lookupTemplate = _options && _options.template;
  var helper;
  var boundTmplInstance;

  if (this.templateInstance) {
    boundTmplInstance = _.bind(this.templateInstance, this);
  }

  if (/^\./.test(name)) {
    // starts with a dot. must be a series of dots which maps to an
    // ancestor of the appropriate height.
    if (!/^(\.)+$/.test(name))
      throw new Error("id starting with dot must be a series of dots");

    return Blaze._parentData(name.length - 1, true /*_functionWrapped*/);

  } else if (template &&
             ((helper = getTemplateHelper(template, name)) != null)) {
    return wrapHelper(bindDataContext(helper), boundTmplInstance);
  } else if (lookupTemplate && (name in Blaze.Template) &&
             (Blaze.Template[name] instanceof Blaze.Template)) {
    return Blaze.Template[name];
  } else if (Blaze._globalHelpers[name] != null) {
    return wrapHelper(bindDataContext(Blaze._globalHelpers[name]),
      boundTmplInstance);
  } else {
    return function () {
      var isCalledAsFunction = (arguments.length > 0);
      var data = Blaze.getData();
      if (lookupTemplate && ! (data && data[name])) {
        throw new Error("No such template: " + name);
      }
      if (isCalledAsFunction && ! (data && data[name])) {
        throw new Error("No such function: " + name);
      }
      if (! data)
        return null;
      var x = data[name];
      if (typeof x !== 'function') {
        if (isCalledAsFunction) {
          throw new Error("Can't call non-function: " + x);
        }
        return x;
      }
      return x.apply(data, arguments);
    };
  }
  return null;
};

// Implement Spacebars' {{../..}}.
// @param height {Number} The number of '..'s
Blaze._parentData = function (height, _functionWrapped) {
  // If height is null or undefined, we default to 1, the first parent.
  if (height == null) {
    height = 1;
  }
  var theWith = Blaze.getView('with');
  for (var i = 0; (i < height) && theWith; i++) {
    theWith = Blaze.getView(theWith, 'with');
  }

  if (! theWith)
    return null;
  if (_functionWrapped)
    return function () { return theWith.dataVar.get(); };
  return theWith.dataVar.get();
};


Blaze.View.prototype.lookupTemplate = function (name) {
  return this.lookup(name, {template:true});
};
// [new] Blaze.Template([viewName], renderFunction)
//
// `Blaze.Template` is the class of templates, like `Template.foo` in
// Meteor, which is `instanceof Template`.
//
// `viewKind` is a string that looks like "Template.foo" for templates
// defined by the compiler.

/**
 * @class
 * @summary Constructor for a Template, which is used to construct Views with particular name and content.
 * @locus Client
 * @param {String} [viewName] Optional.  A name for Views constructed by this Template.  See [`view.name`](#view_name).
 * @param {Function} renderFunction A function that returns [*renderable content*](#renderable_content).  This function is used as the `renderFunction` for Views constructed by this Template.
 */
Blaze.Template = function (viewName, renderFunction) {
  if (! (this instanceof Blaze.Template))
    // called without `new`
    return new Blaze.Template(viewName, renderFunction);

  if (typeof viewName === 'function') {
    // omitted "viewName" argument
    renderFunction = viewName;
    viewName = '';
  }
  if (typeof viewName !== 'string')
    throw new Error("viewName must be a String (or omitted)");
  if (typeof renderFunction !== 'function')
    throw new Error("renderFunction must be a function");

  this.viewName = viewName;
  this.renderFunction = renderFunction;

  this.__helpers = new HelperMap;
  this.__eventMaps = [];

  this._callbacks = {
    created: [],
    rendered: [],
    destroyed: []
  };
};
var Template = Blaze.Template;

var HelperMap = function () {};
HelperMap.prototype.get = function (name) {
  return this[' '+name];
};
HelperMap.prototype.set = function (name, helper) {
  this[' '+name] = helper;
};
HelperMap.prototype.has = function (name) {
  return (' '+name) in this;
};

/**
 * @summary Returns true if `value` is a template object like `Template.myTemplate`.
 * @locus Client
 * @param {Any} value The value to test.
 */
Blaze.isTemplate = function (t) {
  return (t instanceof Blaze.Template);
};

/**
 * @name  onCreated
 * @instance
 * @memberOf Template
 * @summary Register a function to be called when an instance of this template is created.
 * @param {Function} callback A function to be added as a callback.
 * @locus Client
 */
Template.prototype.onCreated = function (cb) {
  this._callbacks.created.push(cb);
};

/**
 * @name  onRendered
 * @instance
 * @memberOf Template
 * @summary Register a function to be called when an instance of this template is inserted into the DOM.
 * @param {Function} callback A function to be added as a callback.
 * @locus Client
 */
Template.prototype.onRendered = function (cb) {
  this._callbacks.rendered.push(cb);
};

/**
 * @name  onDestroyed
 * @instance
 * @memberOf Template
 * @summary Register a function to be called when an instance of this template is removed from the DOM and destroyed.
 * @param {Function} callback A function to be added as a callback.
 * @locus Client
 */
Template.prototype.onDestroyed = function (cb) {
  this._callbacks.destroyed.push(cb);
};

Template.prototype._getCallbacks = function (which) {
  var self = this;
  var callbacks = self[which] ? [self[which]] : [];
  // Fire all callbacks added with the new API (Template.onRendered())
  // as well as the old-style callback (e.g. Template.rendered) for
  // backwards-compatibility.
  callbacks = callbacks.concat(self._callbacks[which]);
  return callbacks;
};

var fireCallbacks = function (callbacks, template) {
  Template._withTemplateInstanceFunc(
    function () { return template; },
    function () {
      for (var i = 0, N = callbacks.length; i < N; i++) {
        callbacks[i].call(template);
      }
    });
};

Template.prototype.constructView = function (contentFunc, elseFunc) {
  var self = this;
  var view = Blaze.View(self.viewName, self.renderFunction);
  view.template = self;

  view.templateContentBlock = (
    contentFunc ? new Template('(contentBlock)', contentFunc) : null);
  view.templateElseBlock = (
    elseFunc ? new Template('(elseBlock)', elseFunc) : null);

  if (self.__eventMaps || typeof self.events === 'object') {
    view._onViewRendered(function () {
      if (view.renderCount !== 1)
        return;

      if (! self.__eventMaps.length && typeof self.events === "object") {
        // Provide limited back-compat support for `.events = {...}`
        // syntax.  Pass `template.events` to the original `.events(...)`
        // function.  This code must run only once per template, in
        // order to not bind the handlers more than once, which is
        // ensured by the fact that we only do this when `__eventMaps`
        // is falsy, and we cause it to be set now.
        Template.prototype.events.call(self, self.events);
      }

      _.each(self.__eventMaps, function (m) {
        Blaze._addEventMap(view, m, view);
      });
    });
  }

  view._templateInstance = new Blaze.TemplateInstance(view);
  view.templateInstance = function () {
    // Update data, firstNode, and lastNode, and return the TemplateInstance
    // object.
    var inst = view._templateInstance;

    /**
     * @instance
     * @memberOf Blaze.TemplateInstance
     * @name  data
     * @summary The data context of this instance's latest invocation.
     * @locus Client
     */
    inst.data = Blaze.getData(view);

    if (view._domrange && !view.isDestroyed) {
      inst.firstNode = view._domrange.firstNode();
      inst.lastNode = view._domrange.lastNode();
    } else {
      // on 'created' or 'destroyed' callbacks we don't have a DomRange
      inst.firstNode = null;
      inst.lastNode = null;
    }

    return inst;
  };

  /**
   * @name  created
   * @instance
   * @memberOf Template
   * @summary Provide a callback when an instance of a template is created.
   * @locus Client
   * @deprecated in 1.1
   */
  // To avoid situations when new callbacks are added in between view
  // instantiation and event being fired, decide on all callbacks to fire
  // immediately and then fire them on the event.
  var createdCallbacks = self._getCallbacks('created');
  view.onViewCreated(function () {
    fireCallbacks(createdCallbacks, view.templateInstance());
  });

  /**
   * @name  rendered
   * @instance
   * @memberOf Template
   * @summary Provide a callback when an instance of a template is rendered.
   * @locus Client
   * @deprecated in 1.1
   */
  var renderedCallbacks = self._getCallbacks('rendered');
  view.onViewReady(function () {
    fireCallbacks(renderedCallbacks, view.templateInstance());
  });

  /**
   * @name  destroyed
   * @instance
   * @memberOf Template
   * @summary Provide a callback when an instance of a template is destroyed.
   * @locus Client
   * @deprecated in 1.1
   */
  var destroyedCallbacks = self._getCallbacks('destroyed');
  view.onViewDestroyed(function () {
    fireCallbacks(destroyedCallbacks, view.templateInstance());
  });

  return view;
};

/**
 * @class
 * @summary The class for template instances
 * @param {Blaze.View} view
 * @instanceName template
 */
Blaze.TemplateInstance = function (view) {
  if (! (this instanceof Blaze.TemplateInstance))
    // called without `new`
    return new Blaze.TemplateInstance(view);

  if (! (view instanceof Blaze.View))
    throw new Error("View required");

  view._templateInstance = this;

  /**
   * @name view
   * @memberOf Blaze.TemplateInstance
   * @instance
   * @summary The [View](#blaze_view) object for this invocation of the template.
   * @locus Client
   * @type {Blaze.View}
   */
  this.view = view;
  this.data = null;

  /**
   * @name firstNode
   * @memberOf Blaze.TemplateInstance
   * @instance
   * @summary The first top-level DOM node in this template instance.
   * @locus Client
   * @type {DOMNode}
   */
  this.firstNode = null;

  /**
   * @name lastNode
   * @memberOf Blaze.TemplateInstance
   * @instance
   * @summary The last top-level DOM node in this template instance.
   * @locus Client
   * @type {DOMNode}
   */
  this.lastNode = null;

  // This dependency is used to identify state transitions in
  // _subscriptionHandles which could cause the result of
  // TemplateInstance#subscriptionsReady to change. Basically this is triggered
  // whenever a new subscription handle is added or when a subscription handle
  // is removed and they are not ready.
  this._allSubsReadyDep = new Tracker.Dependency();
  this._allSubsReady = false;

  this._subscriptionHandles = {};
};

/**
 * @summary Find all elements matching `selector` in this template instance, and return them as a JQuery object.
 * @locus Client
 * @param {String} selector The CSS selector to match, scoped to the template contents.
 * @returns {DOMNode[]}
 */
Blaze.TemplateInstance.prototype.$ = function (selector) {
  var view = this.view;
  if (! view._domrange)
    throw new Error("Can't use $ on template instance with no DOM");
  return view._domrange.$(selector);
};

/**
 * @summary Find all elements matching `selector` in this template instance.
 * @locus Client
 * @param {String} selector The CSS selector to match, scoped to the template contents.
 * @returns {DOMElement[]}
 */
Blaze.TemplateInstance.prototype.findAll = function (selector) {
  return Array.prototype.slice.call(this.$(selector));
};

/**
 * @summary Find one element matching `selector` in this template instance.
 * @locus Client
 * @param {String} selector The CSS selector to match, scoped to the template contents.
 * @returns {DOMElement}
 */
Blaze.TemplateInstance.prototype.find = function (selector) {
  var result = this.$(selector);
  return result[0] || null;
};

/**
 * @summary A version of [Tracker.autorun](#tracker_autorun) that is stopped when the template is destroyed.
 * @locus Client
 * @param {Function} runFunc The function to run. It receives one argument: a Tracker.Computation object.
 */
Blaze.TemplateInstance.prototype.autorun = function (f) {
  return this.view.autorun(f);
};

/**
 * @summary A version of [Meteor.subscribe](#meteor_subscribe) that is stopped
 * when the template is destroyed.
 * @return {SubscriptionHandle} The subscription handle to the newly made
 * subscription. Call `handle.stop()` to manually stop the subscription, or
 * `handle.ready()` to find out if this particular subscription has loaded all
 * of its inital data.
 * @locus Client
 * @param {String} name Name of the subscription.  Matches the name of the
 * server's `publish()` call.
 * @param {Any} [arg1,arg2...] Optional arguments passed to publisher function
 * on server.
 * @param {Function|Object} [callbacks] Optional. May include `onError` and
 * `onReady` callbacks. If a function is passed instead of an object, it is
 * interpreted as an `onReady` callback.
 */
Blaze.TemplateInstance.prototype.subscribe = function (/* arguments */) {
  var self = this;

  var subHandles = self._subscriptionHandles;
  var args = _.toArray(arguments);

  // Duplicate logic from Meteor.subscribe
  var callbacks = {};
  if (args.length) {
    var lastParam = _.last(args);
    if (_.isFunction(lastParam)) {
      callbacks.onReady = args.pop();
    } else if (lastParam &&
      // XXX COMPAT WITH 1.0.3.1 onError used to exist, but now we use
      // onStop with an error callback instead.
      _.any([lastParam.onReady, lastParam.onError, lastParam.onStop],
        _.isFunction)) {
      callbacks = args.pop();
    }
  }

  var subHandle;
  var oldStopped = callbacks.onStop;
  callbacks.onStop = function (error) {
    // When the subscription is stopped, remove it from the set of tracked
    // subscriptions to avoid this list growing without bound
    delete subHandles[subHandle.subscriptionId];

    // Removing a subscription can only change the result of subscriptionsReady
    // if we are not ready (that subscription could be the one blocking us being
    // ready).
    if (! self._allSubsReady) {
      self._allSubsReadyDep.changed();
    }

    if (oldStopped) {
      oldStopped(error);
    }
  };
  args.push(callbacks);

  subHandle = self.view.subscribe.call(self.view, args);

  if (! _.has(subHandles, subHandle.subscriptionId)) {
    subHandles[subHandle.subscriptionId] = subHandle;

    // Adding a new subscription will always cause us to transition from ready
    // to not ready, but if we are already not ready then this can't make us
    // ready.
    if (self._allSubsReady) {
      self._allSubsReadyDep.changed();
    }
  }

  return subHandle;
};

/**
 * @summary A reactive function that returns true when all of the subscriptions
 * called with [this.subscribe](#TemplateInstance-subscribe) are ready.
 * @return {Boolean} True if all subscriptions on this template instance are
 * ready.
 */
Blaze.TemplateInstance.prototype.subscriptionsReady = function () {
  this._allSubsReadyDep.depend();

  this._allSubsReady = _.all(this._subscriptionHandles, function (handle) {
    return handle.ready();
  });

  return this._allSubsReady;
};

/**
 * @summary Specify template helpers available to this template.
 * @locus Client
 * @param {Object} helpers Dictionary of helper functions by name.
 */
Template.prototype.helpers = function (dict) {
  for (var k in dict)
    this.__helpers.set(k, dict[k]);
};

// Kind of like Blaze.currentView but for the template instance.
// This is a function, not a value -- so that not all helpers
// are implicitly dependent on the current template instance's `data` property,
// which would make them dependenct on the data context of the template
// inclusion.
Template._currentTemplateInstanceFunc = null;

Template._withTemplateInstanceFunc = function (templateInstanceFunc, func) {
  if (typeof func !== 'function')
    throw new Error("Expected function, got: " + func);
  var oldTmplInstanceFunc = Template._currentTemplateInstanceFunc;
  try {
    Template._currentTemplateInstanceFunc = templateInstanceFunc;
    return func();
  } finally {
    Template._currentTemplateInstanceFunc = oldTmplInstanceFunc;
  }
};

/**
 * @summary Specify event handlers for this template.
 * @locus Client
 * @param {EventMap} eventMap Event handlers to associate with this template.
 */
Template.prototype.events = function (eventMap) {
  var template = this;
  var eventMap2 = {};
  for (var k in eventMap) {
    eventMap2[k] = (function (k, v) {
      return function (event/*, ...*/) {
        var view = this; // passed by EventAugmenter
        var data = Blaze.getData(event.currentTarget);
        if (data == null)
          data = {};
        var args = Array.prototype.slice.call(arguments);
        var tmplInstanceFunc = _.bind(view.templateInstance, view);
        args.splice(1, 0, tmplInstanceFunc());

        return Template._withTemplateInstanceFunc(tmplInstanceFunc, function () {
          return v.apply(data, args);
        });
      };
    })(k, eventMap[k]);
  }

  template.__eventMaps.push(eventMap2);
};

/**
 * @function
 * @name instance
 * @memberOf Template
 * @summary The [template instance](#template_inst) corresponding to the current template helper, event handler, callback, or autorun.  If there isn't one, `null`.
 * @locus Client
 * @returns Blaze.TemplateInstance
 */
Template.instance = function () {
  return Template._currentTemplateInstanceFunc
    && Template._currentTemplateInstanceFunc();
};

// Note: Template.currentData() is documented to take zero arguments,
// while Blaze.getData takes up to one.

/**
 * @summary
 *
 * - Inside an `onCreated`, `onRendered`, or `onDestroyed` callback, returns
 * the data context of the template.
 * - Inside a helper, returns the data context of the DOM node where the helper
 * was used.
 * - Inside an event handler, returns the data context of the element that fired
 * the event.
 *
 * Establishes a reactive dependency on the result.
 * @locus Client
 * @function
 */
Template.currentData = Blaze.getData;

/**
 * @summary Accesses other data contexts that enclose the current data context.
 * @locus Client
 * @function
 * @param {Integer} [numLevels] The number of levels beyond the current data context to look. Defaults to 1.
 */
Template.parentData = Blaze._parentData;

/**
 * @summary Defines a [helper function](#template_helpers) which can be used from all templates.
 * @locus Client
 * @function
 * @param {String} name The name of the helper function you are defining.
 * @param {Function} function The helper function itself.
 */
Template.registerHelper = Blaze.registerHelper;
  Meteor.Blaze = Blaze;
  Meteor.jQuery = jQuery;
};

},{}],6:[function(require,module,exports){
module.exports = function(underscore) {
  var Meteor;
  var _ = underscore; 

/**
 * @summary The Meteor namespace
 * @namespace Meteor
 */
Meteor = {

  /**
   * @summary Boolean variable.  True if running in client environment.
   * @locus Anywhere
   * @static
   * @type {Boolean}
   */
  isClient: true,

  /**
   * @summary Boolean variable.  True if running in server environment.
   * @locus Anywhere
   * @static
   * @type {Boolean}
   */
  isServer: false,
  isCordova: false
};

if (typeof __meteor_runtime_config__ === 'object' &&
    __meteor_runtime_config__.PUBLIC_SETTINGS) {
  /**
   * @summary `Meteor.settings` contains deployment-specific configuration options. You can initialize settings by passing the `--settings` option (which takes the name of a file containing JSON data) to `meteor run` or `meteor deploy`. When running your server directly (e.g. from a bundle), you instead specify settings by putting the JSON directly into the `METEOR_SETTINGS` environment variable. If you don't provide any settings, `Meteor.settings` will be an empty object.  If the settings object contains a key named `public`, then `Meteor.settings.public` will be available on the client as well as the server.  All other properties of `Meteor.settings` are only defined on the server.
   * @locus Anywhere
   * @type {Object}
   */
  Meteor.settings = { 'public': __meteor_runtime_config__.PUBLIC_SETTINGS };
}
var suppress = 0;

// replacement for console.log. This is a temporary API. We should
// provide a real logging API soon (possibly just a polyfill for
// console?)
//
// NOTE: this is used on the server to print the warning about
// having autopublish enabled when you probably meant to turn it
// off. it's not really the proper use of something called
// _debug. the intent is for this message to go to the terminal and
// be very visible. if you change _debug to go someplace else, etc,
// please fix the autopublish code to do something reasonable.
//
Meteor._debug = function (/* arguments */) {
  if (suppress) {
    suppress--;
    return;
  }
  if (typeof console !== 'undefined' &&
      typeof console.log !== 'undefined') {
    if (arguments.length == 0) { // IE Companion breaks otherwise
      // IE10 PP4 requires at least one argument
      console.log('');
    } else {
      // IE doesn't have console.log.apply, it's not a real Object.
      // http://stackoverflow.com/questions/5538972/console-log-apply-not-working-in-ie9
      // http://patik.com/blog/complete-cross-browser-console-log/
      if (typeof console.log.apply === "function") {
        // Most browsers

        // Chrome and Safari only hyperlink URLs to source files in first argument of
        // console.log, so try to call it with one argument if possible.
        // Approach taken here: If all arguments are strings, join them on space.
        // See https://github.com/meteor/meteor/pull/732#issuecomment-13975991
        var allArgumentsOfTypeString = true;
        for (var i = 0; i < arguments.length; i++)
          if (typeof arguments[i] !== "string")
            allArgumentsOfTypeString = false;

        if (allArgumentsOfTypeString)
          console.log.apply(console, [Array.prototype.join.call(arguments, " ")]);
        else
          console.log.apply(console, arguments);

      } else if (typeof Function.prototype.bind === "function") {
        // IE9
        var log = Function.prototype.bind.call(console.log, console);
        log.apply(console, arguments);
      } else {
        // IE8
        Function.prototype.call.call(console.log, console, Array.prototype.slice.call(arguments));
      }
    }
  }
};

// Suppress the next 'count' Meteor._debug messsages. Use this to
// stop tests from spamming the console.
//
Meteor._suppress_log = function (count) {
  suppress += count;
};
if (Meteor.isServer)
  var Future = Npm.require('fibers/future');

if (typeof __meteor_runtime_config__ === 'object' &&
    __meteor_runtime_config__.meteorRelease) {
  /**
   * @summary `Meteor.release` is a string containing the name of the [release](#meteorupdate) with which the project was built (for example, `"1.2.3"`). It is `undefined` if the project was built using a git checkout of Meteor.
   * @locus Anywhere
   * @type {String}
   */
  Meteor.release = __meteor_runtime_config__.meteorRelease;
}

// XXX find a better home for these? Ideally they would be _.get,
// _.ensure, _.delete..

_.extend(Meteor, {
  // _get(a,b,c,d) returns a[b][c][d], or else undefined if a[b] or
  // a[b][c] doesn't exist.
  //
  _get: function (obj /*, arguments */) {
    for (var i = 1; i < arguments.length; i++) {
      if (!(arguments[i] in obj))
        return undefined;
      obj = obj[arguments[i]];
    }
    return obj;
  },

  // _ensure(a,b,c,d) ensures that a[b][c][d] exists. If it does not,
  // it is created and set to {}. Either way, it is returned.
  //
  _ensure: function (obj /*, arguments */) {
    for (var i = 1; i < arguments.length; i++) {
      var key = arguments[i];
      if (!(key in obj))
        obj[key] = {};
      obj = obj[key];
    }

    return obj;
  },

  // _delete(a, b, c, d) deletes a[b][c][d], then a[b][c] unless it
  // isn't empty, then a[b] unless it isn't empty.
  //
  _delete: function (obj /*, arguments */) {
    var stack = [obj];
    var leaf = true;
    for (var i = 1; i < arguments.length - 1; i++) {
      var key = arguments[i];
      if (!(key in obj)) {
        leaf = false;
        break;
      }
      obj = obj[key];
      if (typeof obj !== "object")
        break;
      stack.push(obj);
    }

    for (var i = stack.length - 1; i >= 0; i--) {
      var key = arguments[i+1];

      if (leaf)
        leaf = false;
      else
        for (var other in stack[i][key])
          return; // not empty -- we're done

      delete stack[i][key];
    }
  },

  // wrapAsync can wrap any function that takes some number of arguments that
  // can't be undefined, followed by some optional arguments, where the callback
  // is the last optional argument.
  // e.g. fs.readFile(pathname, [callback]),
  // fs.open(pathname, flags, [mode], [callback])
  // For maximum effectiveness and least confusion, wrapAsync should be used on
  // functions where the callback is the only argument of type Function.

  /**
   * @memberOf Meteor
   * @summary Wrap a function that takes a callback function as its final parameter. On the server, the wrapped function can be used either synchronously (without passing a callback) or asynchronously (when a callback is passed). On the client, a callback is always required; errors will be logged if there is no callback. If a callback is provided, the environment captured when the original function was called will be restored in the callback.
   * @locus Anywhere
   * @param {Function} func A function that takes a callback as its final parameter
   * @param {Object} [context] Optional `this` object against which the original function will be invoked
   */
  wrapAsync: function (fn, context) {
    return function (/* arguments */) {
      var self = context || this;
      var newArgs = _.toArray(arguments);
      var callback;

      for (var i = newArgs.length - 1; i >= 0; --i) {
        var arg = newArgs[i];
        var type = typeof arg;
        if (type !== "undefined") {
          if (type === "function") {
            callback = arg;
          }
          break;
        }
      }

      if (! callback) {
        if (Meteor.isClient) {
          callback = logErr;
        } else {
          var fut = new Future();
          callback = fut.resolver();
        }
        ++i; // Insert the callback just after arg.
      }

      newArgs[i] = Meteor.bindEnvironment(callback);
      var result = fn.apply(self, newArgs);
      return fut ? fut.wait() : result;
    };
  },

  // Sets child's prototype to a new object whose prototype is parent's
  // prototype. Used as:
  //   Meteor._inherits(ClassB, ClassA).
  //   _.extend(ClassB.prototype, { ... })
  // Inspired by CoffeeScript's `extend` and Google Closure's `goog.inherits`.
  _inherits: function (Child, Parent) {
    // copy Parent static properties
    for (var key in Parent) {
      // make sure we only copy hasOwnProperty properties vs. prototype
      // properties
      if (_.has(Parent, key))
        Child[key] = Parent[key];
    }

    // a middle member of prototype chain: takes the prototype from the Parent
    var Middle = function () {
      this.constructor = Child;
    };
    Middle.prototype = Parent.prototype;
    Child.prototype = new Middle();
    Child.__super__ = Parent.prototype;
    return Child;
  }
});

var warnedAboutWrapAsync = false;

/**
 * @deprecated in 0.9.3
 */
Meteor._wrapAsync = function(fn, context) {
  if (! warnedAboutWrapAsync) {
    Meteor._debug("Meteor._wrapAsync has been renamed to Meteor.wrapAsync");
    warnedAboutWrapAsync = true;
  }
  return Meteor.wrapAsync.apply(Meteor, arguments);
};

function logErr(err) {
  if (err) {
    return Meteor._debug(
      "Exception in callback of async function",
      err.stack ? err.stack : err
    );
  }
}
// This file is a partial analogue to fiber_helpers.js, which allows the client
// to use a queue too, and also to call noYieldsAllowed.

// The client has no ability to yield, so noYieldsAllowed is a noop.
//
Meteor._noYieldsAllowed = function (f) {
  return f();
};

// An even simpler queue of tasks than the fiber-enabled one.  This one just
// runs all the tasks when you call runTask or flush, synchronously.
//
Meteor._SynchronousQueue = function () {
  var self = this;
  self._tasks = [];
  self._running = false;
  self._runTimeout = null;
};

_.extend(Meteor._SynchronousQueue.prototype, {
  runTask: function (task) {
    var self = this;
    if (!self.safeToRunTask())
      throw new Error("Could not synchronously run a task from a running task");
    self._tasks.push(task);
    var tasks = self._tasks;
    self._tasks = [];
    self._running = true;

    if (self._runTimeout) {
      // Since we're going to drain the queue, we can forget about the timeout
      // which tries to run it.  (But if one of our tasks queues something else,
      // the timeout will be correctly re-created.)
      clearTimeout(self._runTimeout);
      self._runTimeout = null;
    }

    try {
      while (!_.isEmpty(tasks)) {
        var t = tasks.shift();
        try {
          t();
        } catch (e) {
          if (_.isEmpty(tasks)) {
            // this was the last task, that is, the one we're calling runTask
            // for.
            throw e;
          } else {
            Meteor._debug("Exception in queued task: " + e.stack);
          }
        }
      }
    } finally {
      self._running = false;
    }
  },

  queueTask: function (task) {
    var self = this;
    self._tasks.push(task);
    // Intentionally not using Meteor.setTimeout, because it doesn't like runing
    // in stubs for now.
    if (!self._runTimeout) {
      self._runTimeout = setTimeout(_.bind(self.flush, self), 0);
    }
  },

  flush: function () {
    var self = this;
    self.runTask(function () {});
  },

  drain: function () {
    var self = this;
    if (!self.safeToRunTask())
      return;
    while (!_.isEmpty(self._tasks)) {
      self.flush();
    }
  },

  safeToRunTask: function () {
    var self = this;
    return !self._running;
  }
});
// Simple implementation of dynamic scoping, for use in browsers

var nextSlot = 0;
var currentValues = [];

Meteor.EnvironmentVariable = function () {
  this.slot = nextSlot++;
};

_.extend(Meteor.EnvironmentVariable.prototype, {
  get: function () {
    return currentValues[this.slot];
  },

  getOrNullIfOutsideFiber: function () {
    return this.get();
  },

  withValue: function (value, func) {
    var saved = currentValues[this.slot];
    try {
      currentValues[this.slot] = value;
      var ret = func();
    } finally {
      currentValues[this.slot] = saved;
    }
    return ret;
  }
});

Meteor.bindEnvironment = function (func, onException, _this) {
  // needed in order to be able to create closures inside func and
  // have the closed variables not change back to their original
  // values
  var boundValues = _.clone(currentValues);

  if (!onException || typeof(onException) === 'string') {
    var description = onException || "callback of async function";
    onException = function (error) {
      Meteor._debug(
        "Exception in " + description + ":",
        error && error.stack || error
      );
    };
  }

  return function (/* arguments */) {
    var savedValues = currentValues;
    try {
      currentValues = boundValues;
      var ret = func.apply(_this, _.toArray(arguments));
    } catch (e) {
      // note: callback-hook currently relies on the fact that if onException
      // throws in the browser, the wrapped call throws.
      onException(e);
    } finally {
      currentValues = savedValues;
    }
    return ret;
  };
};

Meteor._nodeCodeMustBeInFiber = function () {
  // no-op on browser
};
// Makes an error subclass which properly contains a stack trace in most
// environments. constructor can set fields on `this` (and should probably set
// `message`, which is what gets displayed at the top of a stack trace).
//
Meteor.makeErrorType = function (name, constructor) {
  var errorClass = function (/*arguments*/) {
    var self = this;

    // Ensure we get a proper stack trace in most Javascript environments
    if (Error.captureStackTrace) {
      // V8 environments (Chrome and Node.js)
      Error.captureStackTrace(self, errorClass);
    } else {
      // Firefox
      var e = new Error;
      e.__proto__ = errorClass.prototype;
      if (e instanceof errorClass)
        self = e;
    }
    // Safari magically works.

    constructor.apply(self, arguments);

    self.errorType = name;

    return self;
  };

  Meteor._inherits(errorClass, Error);

  return errorClass;
};

// This should probably be in the livedata package, but we don't want
// to require you to use the livedata package to get it. Eventually we
// should probably rename it to DDP.Error and put it back in the
// 'livedata' package (which we should rename to 'ddp' also.)
//
// Note: The DDP server assumes that Meteor.Error EJSON-serializes as an object
// containing 'error' and optionally 'reason' and 'details'.
// The DDP client manually puts these into Meteor.Error objects. (We don't use
// EJSON.addType here because the type is determined by location in the
// protocol, not text on the wire.)

/**
 * @summary This class represents a symbolic error thrown by a method.
 * @locus Anywhere
 * @class
 * @param {String} error A string code uniquely identifying this kind of error.
 * This string should be used by callers of the method to determine the
 * appropriate action to take, instead of attempting to parse the reason
 * or details fields. For example:
 *
 * ```
 * // on the server, pick a code unique to this error
 * // the reason field should be a useful debug message
 * throw new Meteor.Error("logged-out", 
 *   "The user must be logged in to post a comment.");
 *
 * // on the client
 * Meteor.call("methodName", function (error) {
 *   // identify the error
 *   if (error.error === "logged-out") {
 *     // show a nice error message
 *     Session.set("errorMessage", "Please log in to post a comment.");
 *   }
 * });
 * ```
 * 
 * For legacy reasons, some built-in Meteor functions such as `check` throw
 * errors with a number in this field.
 * 
 * @param {String} [reason] Optional.  A short human-readable summary of the
 * error, like 'Not Found'.
 * @param {String} [details] Optional.  Additional information about the error,
 * like a textual stack trace.
 */
Meteor.Error = Meteor.makeErrorType(
  "Meteor.Error",
  function (error, reason, details) {
    var self = this;

    // Currently, a numeric code, likely similar to a HTTP code (eg,
    // 404, 500). That is likely to change though.
    self.error = error;

    // Optional: A short human-readable summary of the error. Not
    // intended to be shown to end users, just developers. ("Not Found",
    // "Internal Server Error")
    self.reason = reason;

    // Optional: Additional information about the error, say for
    // debugging. It might be a (textual) stack trace if the server is
    // willing to provide one. The corresponding thing in HTTP would be
    // the body of a 404 or 500 response. (The difference is that we
    // never expect this to be shown to end users, only developers, so
    // it doesn't need to be pretty.)
    self.details = details;

    // This is what gets displayed at the top of a stack trace. Current
    // format is "[404]" (if no reason is set) or "File not found [404]"
    if (self.reason)
      self.message = self.reason + ' [' + self.error + ']';
    else
      self.message = '[' + self.error + ']';
  });

// Meteor.Error is basically data and is sent over DDP, so you should be able to
// properly EJSON-clone it. This is especially important because if a
// Meteor.Error is thrown through a Future, the error, reason, and details
// properties become non-enumerable so a standard Object clone won't preserve
// them and they will be lost from DDP.
Meteor.Error.prototype.clone = function () {
  var self = this;
  return new Meteor.Error(self.error, self.reason, self.details);
};
// Chooses one of three setImmediate implementations:
//
// * Native setImmediate (IE 10, Node 0.9+)
//
// * postMessage (many browsers)
//
// * setTimeout  (fallback)
//
// The postMessage implementation is based on
// https://github.com/NobleJS/setImmediate/tree/1.0.1
//
// Don't use `nextTick` for Node since it runs its callbacks before
// I/O, which is stricter than we're looking for.
//
// Not installed as a polyfill, as our public API is `Meteor.defer`.
// Since we're not trying to be a polyfill, we have some
// simplifications:
//
// If one invocation of a setImmediate callback pauses itself by a
// call to alert/prompt/showModelDialog, the NobleJS polyfill
// implementation ensured that no setImmedate callback would run until
// the first invocation completed.  While correct per the spec, what it
// would mean for us in practice is that any reactive updates relying
// on Meteor.defer would be hung in the main window until the modal
// dialog was dismissed.  Thus we only ensure that a setImmediate
// function is called in a later event loop.
//
// We don't need to support using a string to be eval'ed for the
// callback, arguments to the function, or clearImmediate.

"use strict";

var global = this;


// IE 10, Node >= 9.1

function useSetImmediate() {
  if (! global.setImmediate)
    return null;
  else {
    var setImmediate = function (fn) {
      global.setImmediate(fn);
    };
    setImmediate.implementation = 'setImmediate';
    return setImmediate;
  }
}


// Android 2.3.6, Chrome 26, Firefox 20, IE 8-9, iOS 5.1.1 Safari

function usePostMessage() {
  // The test against `importScripts` prevents this implementation
  // from being installed inside a web worker, where
  // `global.postMessage` means something completely different and
  // can't be used for this purpose.

  if (!global.postMessage || global.importScripts) {
    return null;
  }

  // Avoid synchronous post message implementations.

  var postMessageIsAsynchronous = true;
  var oldOnMessage = global.onmessage;
  global.onmessage = function () {
      postMessageIsAsynchronous = false;
  };
  global.postMessage("", "*");
  global.onmessage = oldOnMessage;

  if (! postMessageIsAsynchronous)
    return null;

  var funcIndex = 0;
  var funcs = {};

  // Installs an event handler on `global` for the `message` event: see
  // * https://developer.mozilla.org/en/DOM/window.postMessage
  // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

  // XXX use Random.id() here?
  var MESSAGE_PREFIX = "Meteor._setImmediate." + Math.random() + '.';

  function isStringAndStartsWith(string, putativeStart) {
    return (typeof string === "string" &&
            string.substring(0, putativeStart.length) === putativeStart);
  }

  function onGlobalMessage(event) {
    // This will catch all incoming messages (even from other
    // windows!), so we need to try reasonably hard to avoid letting
    // anyone else trick us into firing off. We test the origin is
    // still this window, and that a (randomly generated)
    // unpredictable identifying prefix is present.
    if (event.source === global &&
        isStringAndStartsWith(event.data, MESSAGE_PREFIX)) {
      var index = event.data.substring(MESSAGE_PREFIX.length);
      try {
        if (funcs[index])
          funcs[index]();
      }
      finally {
        delete funcs[index];
      }
    }
  }

  if (global.addEventListener) {
    global.addEventListener("message", onGlobalMessage, false);
  } else {
    global.attachEvent("onmessage", onGlobalMessage);
  }

  var setImmediate = function (fn) {
    // Make `global` post a message to itself with the handle and
    // identifying prefix, thus asynchronously invoking our
    // onGlobalMessage listener above.
    ++funcIndex;
    funcs[funcIndex] = fn;
    global.postMessage(MESSAGE_PREFIX + funcIndex, "*");
  };
  setImmediate.implementation = 'postMessage';
  return setImmediate;
}


function useTimeout() {
  var setImmediate = function (fn) {
    global.setTimeout(fn, 0);
  };
  setImmediate.implementation = 'setTimeout';
  return setImmediate;
}


Meteor._setImmediate =
  useSetImmediate() ||
  usePostMessage() ||
  useTimeout();
  Meteor.underscore = _;
  return Meteor;
};

},{}],7:[function(require,module,exports){
module.exports=function(Meteor) {
  var _ = Meteor.underscore;
  var Base64 = Meteor.Base64
  var EJSON;
  var EJSONTest;
/**
 * @namespace
 * @summary Namespace for EJSON functions
 */
EJSON = {};
EJSONTest = {};



// Custom type interface definition
/**
 * @class CustomType
 * @instanceName customType
 * @memberOf EJSON
 * @summary The interface that a class must satisfy to be able to become an
 * EJSON custom type via EJSON.addType.
 */

/**
 * @function typeName
 * @memberOf EJSON.CustomType
 * @summary Return the tag used to identify this type.  This must match the tag used to register this type with [`EJSON.addType`](#ejson_add_type).
 * @locus Anywhere
 * @instance
 */

/**
 * @function toJSONValue
 * @memberOf EJSON.CustomType
 * @summary Serialize this instance into a JSON-compatible value.
 * @locus Anywhere
 * @instance
 */

/**
 * @function clone
 * @memberOf EJSON.CustomType
 * @summary Return a value `r` such that `this.equals(r)` is true, and modifications to `r` do not affect `this` and vice versa.
 * @locus Anywhere
 * @instance
 */

/**
 * @function equals
 * @memberOf EJSON.CustomType
 * @summary Return `true` if `other` has a value equal to `this`; `false` otherwise.
 * @locus Anywhere
 * @param {Object} other Another object to compare this to.
 * @instance
 */


var customTypes = {};
// Add a custom type, using a method of your choice to get to and
// from a basic JSON-able representation.  The factory argument
// is a function of JSON-able --> your object
// The type you add must have:
// - A toJSONValue() method, so that Meteor can serialize it
// - a typeName() method, to show how to look it up in our type table.
// It is okay if these methods are monkey-patched on.
// EJSON.clone will use toJSONValue and the given factory to produce
// a clone, but you may specify a method clone() that will be
// used instead.
// Similarly, EJSON.equals will use toJSONValue to make comparisons,
// but you may provide a method equals() instead.
/**
 * @summary Add a custom datatype to EJSON.
 * @locus Anywhere
 * @param {String} name A tag for your custom type; must be unique among custom data types defined in your project, and must match the result of your type's `typeName` method.
 * @param {Function} factory A function that deserializes a JSON-compatible value into an instance of your type.  This should match the serialization performed by your type's `toJSONValue` method.
 */
EJSON.addType = function (name, factory) {
  if (_.has(customTypes, name))
    throw new Error("Type " + name + " already present");
  customTypes[name] = factory;
};

var isInfOrNan = function (obj) {
  return _.isNaN(obj) || obj === Infinity || obj === -Infinity;
};

var builtinConverters = [
  { // Date
    matchJSONValue: function (obj) {
      return _.has(obj, '$date') && _.size(obj) === 1;
    },
    matchObject: function (obj) {
      return obj instanceof Date;
    },
    toJSONValue: function (obj) {
      return {$date: obj.getTime()};
    },
    fromJSONValue: function (obj) {
      return new Date(obj.$date);
    }
  },
  { // NaN, Inf, -Inf. (These are the only objects with typeof !== 'object'
    // which we match.)
    matchJSONValue: function (obj) {
      return _.has(obj, '$InfNaN') && _.size(obj) === 1;
    },
    matchObject: isInfOrNan,
    toJSONValue: function (obj) {
      var sign;
      if (_.isNaN(obj))
        sign = 0;
      else if (obj === Infinity)
        sign = 1;
      else
        sign = -1;
      return {$InfNaN: sign};
    },
    fromJSONValue: function (obj) {
      return obj.$InfNaN/0;
    }
  },
  { // Binary
    matchJSONValue: function (obj) {
      return _.has(obj, '$binary') && _.size(obj) === 1;
    },
    matchObject: function (obj) {
      return typeof Uint8Array !== 'undefined' && obj instanceof Uint8Array
        || (obj && _.has(obj, '$Uint8ArrayPolyfill'));
    },
    toJSONValue: function (obj) {
      return {$binary: Base64.encode(obj)};
    },
    fromJSONValue: function (obj) {
      return Base64.decode(obj.$binary);
    }
  },
  { // Escaping one level
    matchJSONValue: function (obj) {
      return _.has(obj, '$escape') && _.size(obj) === 1;
    },
    matchObject: function (obj) {
      if (_.isEmpty(obj) || _.size(obj) > 2) {
        return false;
      }
      return _.any(builtinConverters, function (converter) {
        return converter.matchJSONValue(obj);
      });
    },
    toJSONValue: function (obj) {
      var newObj = {};
      _.each(obj, function (value, key) {
        newObj[key] = EJSON.toJSONValue(value);
      });
      return {$escape: newObj};
    },
    fromJSONValue: function (obj) {
      var newObj = {};
      _.each(obj.$escape, function (value, key) {
        newObj[key] = EJSON.fromJSONValue(value);
      });
      return newObj;
    }
  },
  { // Custom
    matchJSONValue: function (obj) {
      return _.has(obj, '$type') && _.has(obj, '$value') && _.size(obj) === 2;
    },
    matchObject: function (obj) {
      return EJSON._isCustomType(obj);
    },
    toJSONValue: function (obj) {
      var jsonValue = Meteor._noYieldsAllowed(function () {
        return obj.toJSONValue();
      });
      return {$type: obj.typeName(), $value: jsonValue};
    },
    fromJSONValue: function (obj) {
      var typeName = obj.$type;
      if (!_.has(customTypes, typeName))
        throw new Error("Custom EJSON type " + typeName + " is not defined");
      var converter = customTypes[typeName];
      return Meteor._noYieldsAllowed(function () {
        return converter(obj.$value);
      });
    }
  }
];

EJSON._isCustomType = function (obj) {
  return obj &&
    typeof obj.toJSONValue === 'function' &&
    typeof obj.typeName === 'function' &&
    _.has(customTypes, obj.typeName());
};


// for both arrays and objects, in-place modification.
var adjustTypesToJSONValue =
EJSON._adjustTypesToJSONValue = function (obj) {
  // Is it an atom that we need to adjust?
  if (obj === null)
    return null;
  var maybeChanged = toJSONValueHelper(obj);
  if (maybeChanged !== undefined)
    return maybeChanged;

  // Other atoms are unchanged.
  if (typeof obj !== 'object')
    return obj;

  // Iterate over array or object structure.
  _.each(obj, function (value, key) {
    if (typeof value !== 'object' && value !== undefined &&
        !isInfOrNan(value))
      return; // continue

    var changed = toJSONValueHelper(value);
    if (changed) {
      obj[key] = changed;
      return; // on to the next key
    }
    // if we get here, value is an object but not adjustable
    // at this level.  recurse.
    adjustTypesToJSONValue(value);
  });
  return obj;
};

// Either return the JSON-compatible version of the argument, or undefined (if
// the item isn't itself replaceable, but maybe some fields in it are)
var toJSONValueHelper = function (item) {
  for (var i = 0; i < builtinConverters.length; i++) {
    var converter = builtinConverters[i];
    if (converter.matchObject(item)) {
      return converter.toJSONValue(item);
    }
  }
  return undefined;
};

/**
 * @summary Serialize an EJSON-compatible value into its plain JSON representation.
 * @locus Anywhere
 * @param {EJSON} val A value to serialize to plain JSON.
 */
EJSON.toJSONValue = function (item) {
  var changed = toJSONValueHelper(item);
  if (changed !== undefined)
    return changed;
  if (typeof item === 'object') {
    item = EJSON.clone(item);
    adjustTypesToJSONValue(item);
  }
  return item;
};

// for both arrays and objects. Tries its best to just
// use the object you hand it, but may return something
// different if the object you hand it itself needs changing.
//
var adjustTypesFromJSONValue =
EJSON._adjustTypesFromJSONValue = function (obj) {
  if (obj === null)
    return null;
  var maybeChanged = fromJSONValueHelper(obj);
  if (maybeChanged !== obj)
    return maybeChanged;

  // Other atoms are unchanged.
  if (typeof obj !== 'object')
    return obj;

  _.each(obj, function (value, key) {
    if (typeof value === 'object') {
      var changed = fromJSONValueHelper(value);
      if (value !== changed) {
        obj[key] = changed;
        return;
      }
      // if we get here, value is an object but not adjustable
      // at this level.  recurse.
      adjustTypesFromJSONValue(value);
    }
  });
  return obj;
};

// Either return the argument changed to have the non-json
// rep of itself (the Object version) or the argument itself.

// DOES NOT RECURSE.  For actually getting the fully-changed value, use
// EJSON.fromJSONValue
var fromJSONValueHelper = function (value) {
  if (typeof value === 'object' && value !== null) {
    if (_.size(value) <= 2
        && _.all(value, function (v, k) {
          return typeof k === 'string' && k.substr(0, 1) === '$';
        })) {
      for (var i = 0; i < builtinConverters.length; i++) {
        var converter = builtinConverters[i];
        if (converter.matchJSONValue(value)) {
          return converter.fromJSONValue(value);
        }
      }
    }
  }
  return value;
};

/**
 * @summary Deserialize an EJSON value from its plain JSON representation.
 * @locus Anywhere
 * @param {JSONCompatible} val A value to deserialize into EJSON.
 */
EJSON.fromJSONValue = function (item) {
  var changed = fromJSONValueHelper(item);
  if (changed === item && typeof item === 'object') {
    item = EJSON.clone(item);
    adjustTypesFromJSONValue(item);
    return item;
  } else {
    return changed;
  }
};

/**
 * @summary Serialize a value to a string.

For EJSON values, the serialization fully represents the value. For non-EJSON values, serializes the same way as `JSON.stringify`.
 * @locus Anywhere
 * @param {EJSON} val A value to stringify.
 * @param {Object} [options]
 * @param {Boolean | Integer | String} options.indent Indents objects and arrays for easy readability.  When `true`, indents by 2 spaces; when an integer, indents by that number of spaces; and when a string, uses the string as the indentation pattern.
 * @param {Boolean} options.canonical When `true`, stringifies keys in an object in sorted order.
 */
EJSON.stringify = function (item, options) {
  var json = EJSON.toJSONValue(item);
  if (options && (options.canonical || options.indent)) {
    return EJSON._canonicalStringify(json, options);
  } else {
    return JSON.stringify(json);
  }
};

/**
 * @summary Parse a string into an EJSON value. Throws an error if the string is not valid EJSON.
 * @locus Anywhere
 * @param {String} str A string to parse into an EJSON value.
 */
EJSON.parse = function (item) {
  if (typeof item !== 'string')
    throw new Error("EJSON.parse argument should be a string");
  return EJSON.fromJSONValue(JSON.parse(item));
};

/**
 * @summary Returns true if `x` is a buffer of binary data, as returned from [`EJSON.newBinary`](#ejson_new_binary).
 * @param {Object} x The variable to check.
 * @locus Anywhere
 */
EJSON.isBinary = function (obj) {
  return !!((typeof Uint8Array !== 'undefined' && obj instanceof Uint8Array) ||
    (obj && obj.$Uint8ArrayPolyfill));
};

/**
 * @summary Return true if `a` and `b` are equal to each other.  Return false otherwise.  Uses the `equals` method on `a` if present, otherwise performs a deep comparison.
 * @locus Anywhere
 * @param {EJSON} a
 * @param {EJSON} b
 * @param {Object} [options]
 * @param {Boolean} options.keyOrderSensitive Compare in key sensitive order, if supported by the JavaScript implementation.  For example, `{a: 1, b: 2}` is equal to `{b: 2, a: 1}` only when `keyOrderSensitive` is `false`.  The default is `false`.
 */
EJSON.equals = function (a, b, options) {
  var i;
  var keyOrderSensitive = !!(options && options.keyOrderSensitive);
  if (a === b)
    return true;
  if (_.isNaN(a) && _.isNaN(b))
    return true; // This differs from the IEEE spec for NaN equality, b/c we don't want
                 // anything ever with a NaN to be poisoned from becoming equal to anything.
  if (!a || !b) // if either one is falsy, they'd have to be === to be equal
    return false;
  if (!(typeof a === 'object' && typeof b === 'object'))
    return false;
  if (a instanceof Date && b instanceof Date)
    return a.valueOf() === b.valueOf();
  if (EJSON.isBinary(a) && EJSON.isBinary(b)) {
    if (a.length !== b.length)
      return false;
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i])
        return false;
    }
    return true;
  }
  if (typeof (a.equals) === 'function')
    return a.equals(b, options);
  if (typeof (b.equals) === 'function')
    return b.equals(a, options);
  if (a instanceof Array) {
    if (!(b instanceof Array))
      return false;
    if (a.length !== b.length)
      return false;
    for (i = 0; i < a.length; i++) {
      if (!EJSON.equals(a[i], b[i], options))
        return false;
    }
    return true;
  }
  // fallback for custom types that don't implement their own equals
  switch (EJSON._isCustomType(a) + EJSON._isCustomType(b)) {
    case 1: return false;
    case 2: return EJSON.equals(EJSON.toJSONValue(a), EJSON.toJSONValue(b));
  }
  // fall back to structural equality of objects
  var ret;
  if (keyOrderSensitive) {
    var bKeys = [];
    _.each(b, function (val, x) {
        bKeys.push(x);
    });
    i = 0;
    ret = _.all(a, function (val, x) {
      if (i >= bKeys.length) {
        return false;
      }
      if (x !== bKeys[i]) {
        return false;
      }
      if (!EJSON.equals(val, b[bKeys[i]], options)) {
        return false;
      }
      i++;
      return true;
    });
    return ret && i === bKeys.length;
  } else {
    i = 0;
    ret = _.all(a, function (val, key) {
      if (!_.has(b, key)) {
        return false;
      }
      if (!EJSON.equals(val, b[key], options)) {
        return false;
      }
      i++;
      return true;
    });
    return ret && _.size(b) === i;
  }
};

/**
 * @summary Return a deep copy of `val`.
 * @locus Anywhere
 * @param {EJSON} val A value to copy.
 */
EJSON.clone = function (v) {
  var ret;
  if (typeof v !== "object")
    return v;
  if (v === null)
    return null; // null has typeof "object"
  if (v instanceof Date)
    return new Date(v.getTime());
  // RegExps are not really EJSON elements (eg we don't define a serialization
  // for them), but they're immutable anyway, so we can support them in clone.
  if (v instanceof RegExp)
    return v;
  if (EJSON.isBinary(v)) {
    ret = EJSON.newBinary(v.length);
    for (var i = 0; i < v.length; i++) {
      ret[i] = v[i];
    }
    return ret;
  }
  // XXX: Use something better than underscore's isArray
  if (_.isArray(v) || _.isArguments(v)) {
    // For some reason, _.map doesn't work in this context on Opera (weird test
    // failures).
    ret = [];
    for (i = 0; i < v.length; i++)
      ret[i] = EJSON.clone(v[i]);
    return ret;
  }
  // handle general user-defined typed Objects if they have a clone method
  if (typeof v.clone === 'function') {
    return v.clone();
  }
  // handle other custom types
  if (EJSON._isCustomType(v)) {
    return EJSON.fromJSONValue(EJSON.clone(EJSON.toJSONValue(v)), true);
  }
  // handle other objects
  ret = {};
  _.each(v, function (value, key) {
    ret[key] = EJSON.clone(value);
  });
  return ret;
};

/**
 * @summary Allocate a new buffer of binary data that EJSON can serialize.
 * @locus Anywhere
 * @param {Number} size The number of bytes of binary data to allocate.
 */
// EJSON.newBinary is the public documented API for this functionality,
// but the implementation is in the 'base64' package to avoid
// introducing a circular dependency. (If the implementation were here,
// then 'base64' would have to use EJSON.newBinary, and 'ejson' would
// also have to use 'base64'.)
EJSON.newBinary = Base64.newBinary;
  Meteor.EJSON = EJSON;
};

},{}],8:[function(require,module,exports){
module.exports = function(Meteor) {
  var HTML = Meteor.HTML;
  var HTMLTools;
  var TEMPLATE_TAG_POSITION;

HTMLTools = {};
HTMLTools.Parse = {};

var asciiLowerCase = HTMLTools.asciiLowerCase = function (str) {
  return str.replace(/[A-Z]/g, function (c) {
    return String.fromCharCode(c.charCodeAt(0) + 32);
  });
};

var svgCamelCaseAttributes = 'attributeName attributeType baseFrequency baseProfile calcMode clipPathUnits contentScriptType contentStyleType diffuseConstant edgeMode externalResourcesRequired filterRes filterUnits glyphRef glyphRef gradientTransform gradientTransform gradientUnits gradientUnits kernelMatrix kernelUnitLength kernelUnitLength kernelUnitLength keyPoints keySplines keyTimes lengthAdjust limitingConeAngle markerHeight markerUnits markerWidth maskContentUnits maskUnits numOctaves pathLength patternContentUnits patternTransform patternUnits pointsAtX pointsAtY pointsAtZ preserveAlpha preserveAspectRatio primitiveUnits refX refY repeatCount repeatDur requiredExtensions requiredFeatures specularConstant specularExponent specularExponent spreadMethod spreadMethod startOffset stdDeviation stitchTiles surfaceScale surfaceScale systemLanguage tableValues targetX targetY textLength textLength viewBox viewTarget xChannelSelector yChannelSelector zoomAndPan'.split(' ');

var properAttributeCaseMap = (function (map) {
  for (var i = 0; i < svgCamelCaseAttributes.length; i++) {
    var a = svgCamelCaseAttributes[i];
    map[asciiLowerCase(a)] = a;
  }
  return map;
})({});

var properTagCaseMap = (function (map) {
  var knownElements = HTML.knownElementNames;
  for (var i = 0; i < knownElements.length; i++) {
    var a = knownElements[i];
    map[asciiLowerCase(a)] = a;
  }
  return map;
})({});

// Take a tag name in any case and make it the proper case for HTML.
//
// Modern browsers let you embed SVG in HTML, but SVG elements are special
// in that they have a case-sensitive DOM API (nodeName, getAttribute,
// setAttribute).  For example, it has to be `setAttribute("viewBox")`,
// not `"viewbox"`.  However, the browser's HTML parser is NOT case sensitive
// and will fix the case for you, so if you write `<svg viewbox="...">`
// you actually get a `"viewBox"` attribute.  Any HTML-parsing toolchain
// must do the same.
HTMLTools.properCaseTagName = function (name) {
  var lowered = asciiLowerCase(name);
  return properTagCaseMap.hasOwnProperty(lowered) ?
    properTagCaseMap[lowered] : lowered;
};

// See docs for properCaseTagName.
HTMLTools.properCaseAttributeName = function (name) {
  var lowered = asciiLowerCase(name);
  return properAttributeCaseMap.hasOwnProperty(lowered) ?
    properAttributeCaseMap[lowered] : lowered;
};
// This is a Scanner class suitable for any parser/lexer/tokenizer.
//
// A Scanner has an immutable source document (string) `input` and a current
// position `pos`, an index into the string, which can be set at will.
//
// * `new Scanner(input)` - constructs a Scanner with source string `input`
// * `scanner.rest()` - returns the rest of the input after `pos`
// * `scanner.peek()` - returns the character at `pos`
// * `scanner.isEOF()` - true if `pos` is at or beyond the end of `input`
// * `scanner.fatal(msg)` - throw an error indicating a problem at `pos`

Scanner = HTMLTools.Scanner = function (input) {
  this.input = input; // public, read-only
  this.pos = 0; // public, read-write
};

Scanner.prototype.rest = function () {
  // Slicing a string is O(1) in modern JavaScript VMs (including old IE).
  return this.input.slice(this.pos);
};

Scanner.prototype.isEOF = function () {
  return this.pos >= this.input.length;
};

Scanner.prototype.fatal = function (msg) {
  // despite this default, you should always provide a message!
  msg = (msg || "Parse error");

  var CONTEXT_AMOUNT = 20;

  var input = this.input;
  var pos = this.pos;
  var pastInput = input.substring(pos - CONTEXT_AMOUNT - 1, pos);
  if (pastInput.length > CONTEXT_AMOUNT)
    pastInput = '...' + pastInput.substring(-CONTEXT_AMOUNT);

  var upcomingInput = input.substring(pos, pos + CONTEXT_AMOUNT + 1);
  if (upcomingInput.length > CONTEXT_AMOUNT)
    upcomingInput = upcomingInput.substring(0, CONTEXT_AMOUNT) + '...';

  var positionDisplay = ((pastInput + upcomingInput).replace(/\n/g, ' ') + '\n' +
                         (new Array(pastInput.length + 1).join(' ')) + "^");

  var e = new Error(msg + "\n" + positionDisplay);

  e.offset = pos;
  var allPastInput = input.substring(0, pos);
  e.line = (1 + (allPastInput.match(/\n/g) || []).length);
  e.col = (1 + pos - allPastInput.lastIndexOf('\n'));
  e.scanner = this;

  throw e;
};

// Peek at the next character.
//
// If `isEOF`, returns an empty string.
Scanner.prototype.peek = function () {
  return this.input.charAt(this.pos);
};

// Constructs a `getFoo` function where `foo` is specified with a regex.
// The regex should start with `^`.  The constructed function will return
// match group 1, if it exists and matches a non-empty string, or else
// the entire matched string (or null if there is no match).
//
// A `getFoo` function tries to match and consume a foo.  If it succeeds,
// the current position of the scanner is advanced.  If it fails, the
// current position is not advanced and a falsy value (typically null)
// is returned.
makeRegexMatcher = function (regex) {
  return function (scanner) {
    var match = regex.exec(scanner.rest());

    if (! match)
      return null;

    scanner.pos += match[0].length;
    return match[1] || match[0];
  };
};

// http://www.whatwg.org/specs/web-apps/current-work/multipage/entities.json


// Note that some entities don't have a final semicolon!  These are used to
// make `&lt` (for example) with no semicolon a parse error but `&abcde` not.

var ENTITIES = {
  "&Aacute;": { "codepoints": [193], "characters": "\u00C1" },
  "&Aacute": { "codepoints": [193], "characters": "\u00C1" },
  "&aacute;": { "codepoints": [225], "characters": "\u00E1" },
  "&aacute": { "codepoints": [225], "characters": "\u00E1" },
  "&Abreve;": { "codepoints": [258], "characters": "\u0102" },
  "&abreve;": { "codepoints": [259], "characters": "\u0103" },
  "&ac;": { "codepoints": [8766], "characters": "\u223E" },
  "&acd;": { "codepoints": [8767], "characters": "\u223F" },
  "&acE;": { "codepoints": [8766, 819], "characters": "\u223E\u0333" },
  "&Acirc;": { "codepoints": [194], "characters": "\u00C2" },
  "&Acirc": { "codepoints": [194], "characters": "\u00C2" },
  "&acirc;": { "codepoints": [226], "characters": "\u00E2" },
  "&acirc": { "codepoints": [226], "characters": "\u00E2" },
  "&acute;": { "codepoints": [180], "characters": "\u00B4" },
  "&acute": { "codepoints": [180], "characters": "\u00B4" },
  "&Acy;": { "codepoints": [1040], "characters": "\u0410" },
  "&acy;": { "codepoints": [1072], "characters": "\u0430" },
  "&AElig;": { "codepoints": [198], "characters": "\u00C6" },
  "&AElig": { "codepoints": [198], "characters": "\u00C6" },
  "&aelig;": { "codepoints": [230], "characters": "\u00E6" },
  "&aelig": { "codepoints": [230], "characters": "\u00E6" },
  "&af;": { "codepoints": [8289], "characters": "\u2061" },
  "&Afr;": { "codepoints": [120068], "characters": "\uD835\uDD04" },
  "&afr;": { "codepoints": [120094], "characters": "\uD835\uDD1E" },
  "&Agrave;": { "codepoints": [192], "characters": "\u00C0" },
  "&Agrave": { "codepoints": [192], "characters": "\u00C0" },
  "&agrave;": { "codepoints": [224], "characters": "\u00E0" },
  "&agrave": { "codepoints": [224], "characters": "\u00E0" },
  "&alefsym;": { "codepoints": [8501], "characters": "\u2135" },
  "&aleph;": { "codepoints": [8501], "characters": "\u2135" },
  "&Alpha;": { "codepoints": [913], "characters": "\u0391" },
  "&alpha;": { "codepoints": [945], "characters": "\u03B1" },
  "&Amacr;": { "codepoints": [256], "characters": "\u0100" },
  "&amacr;": { "codepoints": [257], "characters": "\u0101" },
  "&amalg;": { "codepoints": [10815], "characters": "\u2A3F" },
  "&amp;": { "codepoints": [38], "characters": "\u0026" },
  "&amp": { "codepoints": [38], "characters": "\u0026" },
  "&AMP;": { "codepoints": [38], "characters": "\u0026" },
  "&AMP": { "codepoints": [38], "characters": "\u0026" },
  "&andand;": { "codepoints": [10837], "characters": "\u2A55" },
  "&And;": { "codepoints": [10835], "characters": "\u2A53" },
  "&and;": { "codepoints": [8743], "characters": "\u2227" },
  "&andd;": { "codepoints": [10844], "characters": "\u2A5C" },
  "&andslope;": { "codepoints": [10840], "characters": "\u2A58" },
  "&andv;": { "codepoints": [10842], "characters": "\u2A5A" },
  "&ang;": { "codepoints": [8736], "characters": "\u2220" },
  "&ange;": { "codepoints": [10660], "characters": "\u29A4" },
  "&angle;": { "codepoints": [8736], "characters": "\u2220" },
  "&angmsdaa;": { "codepoints": [10664], "characters": "\u29A8" },
  "&angmsdab;": { "codepoints": [10665], "characters": "\u29A9" },
  "&angmsdac;": { "codepoints": [10666], "characters": "\u29AA" },
  "&angmsdad;": { "codepoints": [10667], "characters": "\u29AB" },
  "&angmsdae;": { "codepoints": [10668], "characters": "\u29AC" },
  "&angmsdaf;": { "codepoints": [10669], "characters": "\u29AD" },
  "&angmsdag;": { "codepoints": [10670], "characters": "\u29AE" },
  "&angmsdah;": { "codepoints": [10671], "characters": "\u29AF" },
  "&angmsd;": { "codepoints": [8737], "characters": "\u2221" },
  "&angrt;": { "codepoints": [8735], "characters": "\u221F" },
  "&angrtvb;": { "codepoints": [8894], "characters": "\u22BE" },
  "&angrtvbd;": { "codepoints": [10653], "characters": "\u299D" },
  "&angsph;": { "codepoints": [8738], "characters": "\u2222" },
  "&angst;": { "codepoints": [197], "characters": "\u00C5" },
  "&angzarr;": { "codepoints": [9084], "characters": "\u237C" },
  "&Aogon;": { "codepoints": [260], "characters": "\u0104" },
  "&aogon;": { "codepoints": [261], "characters": "\u0105" },
  "&Aopf;": { "codepoints": [120120], "characters": "\uD835\uDD38" },
  "&aopf;": { "codepoints": [120146], "characters": "\uD835\uDD52" },
  "&apacir;": { "codepoints": [10863], "characters": "\u2A6F" },
  "&ap;": { "codepoints": [8776], "characters": "\u2248" },
  "&apE;": { "codepoints": [10864], "characters": "\u2A70" },
  "&ape;": { "codepoints": [8778], "characters": "\u224A" },
  "&apid;": { "codepoints": [8779], "characters": "\u224B" },
  "&apos;": { "codepoints": [39], "characters": "\u0027" },
  "&ApplyFunction;": { "codepoints": [8289], "characters": "\u2061" },
  "&approx;": { "codepoints": [8776], "characters": "\u2248" },
  "&approxeq;": { "codepoints": [8778], "characters": "\u224A" },
  "&Aring;": { "codepoints": [197], "characters": "\u00C5" },
  "&Aring": { "codepoints": [197], "characters": "\u00C5" },
  "&aring;": { "codepoints": [229], "characters": "\u00E5" },
  "&aring": { "codepoints": [229], "characters": "\u00E5" },
  "&Ascr;": { "codepoints": [119964], "characters": "\uD835\uDC9C" },
  "&ascr;": { "codepoints": [119990], "characters": "\uD835\uDCB6" },
  "&Assign;": { "codepoints": [8788], "characters": "\u2254" },
  "&ast;": { "codepoints": [42], "characters": "\u002A" },
  "&asymp;": { "codepoints": [8776], "characters": "\u2248" },
  "&asympeq;": { "codepoints": [8781], "characters": "\u224D" },
  "&Atilde;": { "codepoints": [195], "characters": "\u00C3" },
  "&Atilde": { "codepoints": [195], "characters": "\u00C3" },
  "&atilde;": { "codepoints": [227], "characters": "\u00E3" },
  "&atilde": { "codepoints": [227], "characters": "\u00E3" },
  "&Auml;": { "codepoints": [196], "characters": "\u00C4" },
  "&Auml": { "codepoints": [196], "characters": "\u00C4" },
  "&auml;": { "codepoints": [228], "characters": "\u00E4" },
  "&auml": { "codepoints": [228], "characters": "\u00E4" },
  "&awconint;": { "codepoints": [8755], "characters": "\u2233" },
  "&awint;": { "codepoints": [10769], "characters": "\u2A11" },
  "&backcong;": { "codepoints": [8780], "characters": "\u224C" },
  "&backepsilon;": { "codepoints": [1014], "characters": "\u03F6" },
  "&backprime;": { "codepoints": [8245], "characters": "\u2035" },
  "&backsim;": { "codepoints": [8765], "characters": "\u223D" },
  "&backsimeq;": { "codepoints": [8909], "characters": "\u22CD" },
  "&Backslash;": { "codepoints": [8726], "characters": "\u2216" },
  "&Barv;": { "codepoints": [10983], "characters": "\u2AE7" },
  "&barvee;": { "codepoints": [8893], "characters": "\u22BD" },
  "&barwed;": { "codepoints": [8965], "characters": "\u2305" },
  "&Barwed;": { "codepoints": [8966], "characters": "\u2306" },
  "&barwedge;": { "codepoints": [8965], "characters": "\u2305" },
  "&bbrk;": { "codepoints": [9141], "characters": "\u23B5" },
  "&bbrktbrk;": { "codepoints": [9142], "characters": "\u23B6" },
  "&bcong;": { "codepoints": [8780], "characters": "\u224C" },
  "&Bcy;": { "codepoints": [1041], "characters": "\u0411" },
  "&bcy;": { "codepoints": [1073], "characters": "\u0431" },
  "&bdquo;": { "codepoints": [8222], "characters": "\u201E" },
  "&becaus;": { "codepoints": [8757], "characters": "\u2235" },
  "&because;": { "codepoints": [8757], "characters": "\u2235" },
  "&Because;": { "codepoints": [8757], "characters": "\u2235" },
  "&bemptyv;": { "codepoints": [10672], "characters": "\u29B0" },
  "&bepsi;": { "codepoints": [1014], "characters": "\u03F6" },
  "&bernou;": { "codepoints": [8492], "characters": "\u212C" },
  "&Bernoullis;": { "codepoints": [8492], "characters": "\u212C" },
  "&Beta;": { "codepoints": [914], "characters": "\u0392" },
  "&beta;": { "codepoints": [946], "characters": "\u03B2" },
  "&beth;": { "codepoints": [8502], "characters": "\u2136" },
  "&between;": { "codepoints": [8812], "characters": "\u226C" },
  "&Bfr;": { "codepoints": [120069], "characters": "\uD835\uDD05" },
  "&bfr;": { "codepoints": [120095], "characters": "\uD835\uDD1F" },
  "&bigcap;": { "codepoints": [8898], "characters": "\u22C2" },
  "&bigcirc;": { "codepoints": [9711], "characters": "\u25EF" },
  "&bigcup;": { "codepoints": [8899], "characters": "\u22C3" },
  "&bigodot;": { "codepoints": [10752], "characters": "\u2A00" },
  "&bigoplus;": { "codepoints": [10753], "characters": "\u2A01" },
  "&bigotimes;": { "codepoints": [10754], "characters": "\u2A02" },
  "&bigsqcup;": { "codepoints": [10758], "characters": "\u2A06" },
  "&bigstar;": { "codepoints": [9733], "characters": "\u2605" },
  "&bigtriangledown;": { "codepoints": [9661], "characters": "\u25BD" },
  "&bigtriangleup;": { "codepoints": [9651], "characters": "\u25B3" },
  "&biguplus;": { "codepoints": [10756], "characters": "\u2A04" },
  "&bigvee;": { "codepoints": [8897], "characters": "\u22C1" },
  "&bigwedge;": { "codepoints": [8896], "characters": "\u22C0" },
  "&bkarow;": { "codepoints": [10509], "characters": "\u290D" },
  "&blacklozenge;": { "codepoints": [10731], "characters": "\u29EB" },
  "&blacksquare;": { "codepoints": [9642], "characters": "\u25AA" },
  "&blacktriangle;": { "codepoints": [9652], "characters": "\u25B4" },
  "&blacktriangledown;": { "codepoints": [9662], "characters": "\u25BE" },
  "&blacktriangleleft;": { "codepoints": [9666], "characters": "\u25C2" },
  "&blacktriangleright;": { "codepoints": [9656], "characters": "\u25B8" },
  "&blank;": { "codepoints": [9251], "characters": "\u2423" },
  "&blk12;": { "codepoints": [9618], "characters": "\u2592" },
  "&blk14;": { "codepoints": [9617], "characters": "\u2591" },
  "&blk34;": { "codepoints": [9619], "characters": "\u2593" },
  "&block;": { "codepoints": [9608], "characters": "\u2588" },
  "&bne;": { "codepoints": [61, 8421], "characters": "\u003D\u20E5" },
  "&bnequiv;": { "codepoints": [8801, 8421], "characters": "\u2261\u20E5" },
  "&bNot;": { "codepoints": [10989], "characters": "\u2AED" },
  "&bnot;": { "codepoints": [8976], "characters": "\u2310" },
  "&Bopf;": { "codepoints": [120121], "characters": "\uD835\uDD39" },
  "&bopf;": { "codepoints": [120147], "characters": "\uD835\uDD53" },
  "&bot;": { "codepoints": [8869], "characters": "\u22A5" },
  "&bottom;": { "codepoints": [8869], "characters": "\u22A5" },
  "&bowtie;": { "codepoints": [8904], "characters": "\u22C8" },
  "&boxbox;": { "codepoints": [10697], "characters": "\u29C9" },
  "&boxdl;": { "codepoints": [9488], "characters": "\u2510" },
  "&boxdL;": { "codepoints": [9557], "characters": "\u2555" },
  "&boxDl;": { "codepoints": [9558], "characters": "\u2556" },
  "&boxDL;": { "codepoints": [9559], "characters": "\u2557" },
  "&boxdr;": { "codepoints": [9484], "characters": "\u250C" },
  "&boxdR;": { "codepoints": [9554], "characters": "\u2552" },
  "&boxDr;": { "codepoints": [9555], "characters": "\u2553" },
  "&boxDR;": { "codepoints": [9556], "characters": "\u2554" },
  "&boxh;": { "codepoints": [9472], "characters": "\u2500" },
  "&boxH;": { "codepoints": [9552], "characters": "\u2550" },
  "&boxhd;": { "codepoints": [9516], "characters": "\u252C" },
  "&boxHd;": { "codepoints": [9572], "characters": "\u2564" },
  "&boxhD;": { "codepoints": [9573], "characters": "\u2565" },
  "&boxHD;": { "codepoints": [9574], "characters": "\u2566" },
  "&boxhu;": { "codepoints": [9524], "characters": "\u2534" },
  "&boxHu;": { "codepoints": [9575], "characters": "\u2567" },
  "&boxhU;": { "codepoints": [9576], "characters": "\u2568" },
  "&boxHU;": { "codepoints": [9577], "characters": "\u2569" },
  "&boxminus;": { "codepoints": [8863], "characters": "\u229F" },
  "&boxplus;": { "codepoints": [8862], "characters": "\u229E" },
  "&boxtimes;": { "codepoints": [8864], "characters": "\u22A0" },
  "&boxul;": { "codepoints": [9496], "characters": "\u2518" },
  "&boxuL;": { "codepoints": [9563], "characters": "\u255B" },
  "&boxUl;": { "codepoints": [9564], "characters": "\u255C" },
  "&boxUL;": { "codepoints": [9565], "characters": "\u255D" },
  "&boxur;": { "codepoints": [9492], "characters": "\u2514" },
  "&boxuR;": { "codepoints": [9560], "characters": "\u2558" },
  "&boxUr;": { "codepoints": [9561], "characters": "\u2559" },
  "&boxUR;": { "codepoints": [9562], "characters": "\u255A" },
  "&boxv;": { "codepoints": [9474], "characters": "\u2502" },
  "&boxV;": { "codepoints": [9553], "characters": "\u2551" },
  "&boxvh;": { "codepoints": [9532], "characters": "\u253C" },
  "&boxvH;": { "codepoints": [9578], "characters": "\u256A" },
  "&boxVh;": { "codepoints": [9579], "characters": "\u256B" },
  "&boxVH;": { "codepoints": [9580], "characters": "\u256C" },
  "&boxvl;": { "codepoints": [9508], "characters": "\u2524" },
  "&boxvL;": { "codepoints": [9569], "characters": "\u2561" },
  "&boxVl;": { "codepoints": [9570], "characters": "\u2562" },
  "&boxVL;": { "codepoints": [9571], "characters": "\u2563" },
  "&boxvr;": { "codepoints": [9500], "characters": "\u251C" },
  "&boxvR;": { "codepoints": [9566], "characters": "\u255E" },
  "&boxVr;": { "codepoints": [9567], "characters": "\u255F" },
  "&boxVR;": { "codepoints": [9568], "characters": "\u2560" },
  "&bprime;": { "codepoints": [8245], "characters": "\u2035" },
  "&breve;": { "codepoints": [728], "characters": "\u02D8" },
  "&Breve;": { "codepoints": [728], "characters": "\u02D8" },
  "&brvbar;": { "codepoints": [166], "characters": "\u00A6" },
  "&brvbar": { "codepoints": [166], "characters": "\u00A6" },
  "&bscr;": { "codepoints": [119991], "characters": "\uD835\uDCB7" },
  "&Bscr;": { "codepoints": [8492], "characters": "\u212C" },
  "&bsemi;": { "codepoints": [8271], "characters": "\u204F" },
  "&bsim;": { "codepoints": [8765], "characters": "\u223D" },
  "&bsime;": { "codepoints": [8909], "characters": "\u22CD" },
  "&bsolb;": { "codepoints": [10693], "characters": "\u29C5" },
  "&bsol;": { "codepoints": [92], "characters": "\u005C" },
  "&bsolhsub;": { "codepoints": [10184], "characters": "\u27C8" },
  "&bull;": { "codepoints": [8226], "characters": "\u2022" },
  "&bullet;": { "codepoints": [8226], "characters": "\u2022" },
  "&bump;": { "codepoints": [8782], "characters": "\u224E" },
  "&bumpE;": { "codepoints": [10926], "characters": "\u2AAE" },
  "&bumpe;": { "codepoints": [8783], "characters": "\u224F" },
  "&Bumpeq;": { "codepoints": [8782], "characters": "\u224E" },
  "&bumpeq;": { "codepoints": [8783], "characters": "\u224F" },
  "&Cacute;": { "codepoints": [262], "characters": "\u0106" },
  "&cacute;": { "codepoints": [263], "characters": "\u0107" },
  "&capand;": { "codepoints": [10820], "characters": "\u2A44" },
  "&capbrcup;": { "codepoints": [10825], "characters": "\u2A49" },
  "&capcap;": { "codepoints": [10827], "characters": "\u2A4B" },
  "&cap;": { "codepoints": [8745], "characters": "\u2229" },
  "&Cap;": { "codepoints": [8914], "characters": "\u22D2" },
  "&capcup;": { "codepoints": [10823], "characters": "\u2A47" },
  "&capdot;": { "codepoints": [10816], "characters": "\u2A40" },
  "&CapitalDifferentialD;": { "codepoints": [8517], "characters": "\u2145" },
  "&caps;": { "codepoints": [8745, 65024], "characters": "\u2229\uFE00" },
  "&caret;": { "codepoints": [8257], "characters": "\u2041" },
  "&caron;": { "codepoints": [711], "characters": "\u02C7" },
  "&Cayleys;": { "codepoints": [8493], "characters": "\u212D" },
  "&ccaps;": { "codepoints": [10829], "characters": "\u2A4D" },
  "&Ccaron;": { "codepoints": [268], "characters": "\u010C" },
  "&ccaron;": { "codepoints": [269], "characters": "\u010D" },
  "&Ccedil;": { "codepoints": [199], "characters": "\u00C7" },
  "&Ccedil": { "codepoints": [199], "characters": "\u00C7" },
  "&ccedil;": { "codepoints": [231], "characters": "\u00E7" },
  "&ccedil": { "codepoints": [231], "characters": "\u00E7" },
  "&Ccirc;": { "codepoints": [264], "characters": "\u0108" },
  "&ccirc;": { "codepoints": [265], "characters": "\u0109" },
  "&Cconint;": { "codepoints": [8752], "characters": "\u2230" },
  "&ccups;": { "codepoints": [10828], "characters": "\u2A4C" },
  "&ccupssm;": { "codepoints": [10832], "characters": "\u2A50" },
  "&Cdot;": { "codepoints": [266], "characters": "\u010A" },
  "&cdot;": { "codepoints": [267], "characters": "\u010B" },
  "&cedil;": { "codepoints": [184], "characters": "\u00B8" },
  "&cedil": { "codepoints": [184], "characters": "\u00B8" },
  "&Cedilla;": { "codepoints": [184], "characters": "\u00B8" },
  "&cemptyv;": { "codepoints": [10674], "characters": "\u29B2" },
  "&cent;": { "codepoints": [162], "characters": "\u00A2" },
  "&cent": { "codepoints": [162], "characters": "\u00A2" },
  "&centerdot;": { "codepoints": [183], "characters": "\u00B7" },
  "&CenterDot;": { "codepoints": [183], "characters": "\u00B7" },
  "&cfr;": { "codepoints": [120096], "characters": "\uD835\uDD20" },
  "&Cfr;": { "codepoints": [8493], "characters": "\u212D" },
  "&CHcy;": { "codepoints": [1063], "characters": "\u0427" },
  "&chcy;": { "codepoints": [1095], "characters": "\u0447" },
  "&check;": { "codepoints": [10003], "characters": "\u2713" },
  "&checkmark;": { "codepoints": [10003], "characters": "\u2713" },
  "&Chi;": { "codepoints": [935], "characters": "\u03A7" },
  "&chi;": { "codepoints": [967], "characters": "\u03C7" },
  "&circ;": { "codepoints": [710], "characters": "\u02C6" },
  "&circeq;": { "codepoints": [8791], "characters": "\u2257" },
  "&circlearrowleft;": { "codepoints": [8634], "characters": "\u21BA" },
  "&circlearrowright;": { "codepoints": [8635], "characters": "\u21BB" },
  "&circledast;": { "codepoints": [8859], "characters": "\u229B" },
  "&circledcirc;": { "codepoints": [8858], "characters": "\u229A" },
  "&circleddash;": { "codepoints": [8861], "characters": "\u229D" },
  "&CircleDot;": { "codepoints": [8857], "characters": "\u2299" },
  "&circledR;": { "codepoints": [174], "characters": "\u00AE" },
  "&circledS;": { "codepoints": [9416], "characters": "\u24C8" },
  "&CircleMinus;": { "codepoints": [8854], "characters": "\u2296" },
  "&CirclePlus;": { "codepoints": [8853], "characters": "\u2295" },
  "&CircleTimes;": { "codepoints": [8855], "characters": "\u2297" },
  "&cir;": { "codepoints": [9675], "characters": "\u25CB" },
  "&cirE;": { "codepoints": [10691], "characters": "\u29C3" },
  "&cire;": { "codepoints": [8791], "characters": "\u2257" },
  "&cirfnint;": { "codepoints": [10768], "characters": "\u2A10" },
  "&cirmid;": { "codepoints": [10991], "characters": "\u2AEF" },
  "&cirscir;": { "codepoints": [10690], "characters": "\u29C2" },
  "&ClockwiseContourIntegral;": { "codepoints": [8754], "characters": "\u2232" },
  "&CloseCurlyDoubleQuote;": { "codepoints": [8221], "characters": "\u201D" },
  "&CloseCurlyQuote;": { "codepoints": [8217], "characters": "\u2019" },
  "&clubs;": { "codepoints": [9827], "characters": "\u2663" },
  "&clubsuit;": { "codepoints": [9827], "characters": "\u2663" },
  "&colon;": { "codepoints": [58], "characters": "\u003A" },
  "&Colon;": { "codepoints": [8759], "characters": "\u2237" },
  "&Colone;": { "codepoints": [10868], "characters": "\u2A74" },
  "&colone;": { "codepoints": [8788], "characters": "\u2254" },
  "&coloneq;": { "codepoints": [8788], "characters": "\u2254" },
  "&comma;": { "codepoints": [44], "characters": "\u002C" },
  "&commat;": { "codepoints": [64], "characters": "\u0040" },
  "&comp;": { "codepoints": [8705], "characters": "\u2201" },
  "&compfn;": { "codepoints": [8728], "characters": "\u2218" },
  "&complement;": { "codepoints": [8705], "characters": "\u2201" },
  "&complexes;": { "codepoints": [8450], "characters": "\u2102" },
  "&cong;": { "codepoints": [8773], "characters": "\u2245" },
  "&congdot;": { "codepoints": [10861], "characters": "\u2A6D" },
  "&Congruent;": { "codepoints": [8801], "characters": "\u2261" },
  "&conint;": { "codepoints": [8750], "characters": "\u222E" },
  "&Conint;": { "codepoints": [8751], "characters": "\u222F" },
  "&ContourIntegral;": { "codepoints": [8750], "characters": "\u222E" },
  "&copf;": { "codepoints": [120148], "characters": "\uD835\uDD54" },
  "&Copf;": { "codepoints": [8450], "characters": "\u2102" },
  "&coprod;": { "codepoints": [8720], "characters": "\u2210" },
  "&Coproduct;": { "codepoints": [8720], "characters": "\u2210" },
  "&copy;": { "codepoints": [169], "characters": "\u00A9" },
  "&copy": { "codepoints": [169], "characters": "\u00A9" },
  "&COPY;": { "codepoints": [169], "characters": "\u00A9" },
  "&COPY": { "codepoints": [169], "characters": "\u00A9" },
  "&copysr;": { "codepoints": [8471], "characters": "\u2117" },
  "&CounterClockwiseContourIntegral;": { "codepoints": [8755], "characters": "\u2233" },
  "&crarr;": { "codepoints": [8629], "characters": "\u21B5" },
  "&cross;": { "codepoints": [10007], "characters": "\u2717" },
  "&Cross;": { "codepoints": [10799], "characters": "\u2A2F" },
  "&Cscr;": { "codepoints": [119966], "characters": "\uD835\uDC9E" },
  "&cscr;": { "codepoints": [119992], "characters": "\uD835\uDCB8" },
  "&csub;": { "codepoints": [10959], "characters": "\u2ACF" },
  "&csube;": { "codepoints": [10961], "characters": "\u2AD1" },
  "&csup;": { "codepoints": [10960], "characters": "\u2AD0" },
  "&csupe;": { "codepoints": [10962], "characters": "\u2AD2" },
  "&ctdot;": { "codepoints": [8943], "characters": "\u22EF" },
  "&cudarrl;": { "codepoints": [10552], "characters": "\u2938" },
  "&cudarrr;": { "codepoints": [10549], "characters": "\u2935" },
  "&cuepr;": { "codepoints": [8926], "characters": "\u22DE" },
  "&cuesc;": { "codepoints": [8927], "characters": "\u22DF" },
  "&cularr;": { "codepoints": [8630], "characters": "\u21B6" },
  "&cularrp;": { "codepoints": [10557], "characters": "\u293D" },
  "&cupbrcap;": { "codepoints": [10824], "characters": "\u2A48" },
  "&cupcap;": { "codepoints": [10822], "characters": "\u2A46" },
  "&CupCap;": { "codepoints": [8781], "characters": "\u224D" },
  "&cup;": { "codepoints": [8746], "characters": "\u222A" },
  "&Cup;": { "codepoints": [8915], "characters": "\u22D3" },
  "&cupcup;": { "codepoints": [10826], "characters": "\u2A4A" },
  "&cupdot;": { "codepoints": [8845], "characters": "\u228D" },
  "&cupor;": { "codepoints": [10821], "characters": "\u2A45" },
  "&cups;": { "codepoints": [8746, 65024], "characters": "\u222A\uFE00" },
  "&curarr;": { "codepoints": [8631], "characters": "\u21B7" },
  "&curarrm;": { "codepoints": [10556], "characters": "\u293C" },
  "&curlyeqprec;": { "codepoints": [8926], "characters": "\u22DE" },
  "&curlyeqsucc;": { "codepoints": [8927], "characters": "\u22DF" },
  "&curlyvee;": { "codepoints": [8910], "characters": "\u22CE" },
  "&curlywedge;": { "codepoints": [8911], "characters": "\u22CF" },
  "&curren;": { "codepoints": [164], "characters": "\u00A4" },
  "&curren": { "codepoints": [164], "characters": "\u00A4" },
  "&curvearrowleft;": { "codepoints": [8630], "characters": "\u21B6" },
  "&curvearrowright;": { "codepoints": [8631], "characters": "\u21B7" },
  "&cuvee;": { "codepoints": [8910], "characters": "\u22CE" },
  "&cuwed;": { "codepoints": [8911], "characters": "\u22CF" },
  "&cwconint;": { "codepoints": [8754], "characters": "\u2232" },
  "&cwint;": { "codepoints": [8753], "characters": "\u2231" },
  "&cylcty;": { "codepoints": [9005], "characters": "\u232D" },
  "&dagger;": { "codepoints": [8224], "characters": "\u2020" },
  "&Dagger;": { "codepoints": [8225], "characters": "\u2021" },
  "&daleth;": { "codepoints": [8504], "characters": "\u2138" },
  "&darr;": { "codepoints": [8595], "characters": "\u2193" },
  "&Darr;": { "codepoints": [8609], "characters": "\u21A1" },
  "&dArr;": { "codepoints": [8659], "characters": "\u21D3" },
  "&dash;": { "codepoints": [8208], "characters": "\u2010" },
  "&Dashv;": { "codepoints": [10980], "characters": "\u2AE4" },
  "&dashv;": { "codepoints": [8867], "characters": "\u22A3" },
  "&dbkarow;": { "codepoints": [10511], "characters": "\u290F" },
  "&dblac;": { "codepoints": [733], "characters": "\u02DD" },
  "&Dcaron;": { "codepoints": [270], "characters": "\u010E" },
  "&dcaron;": { "codepoints": [271], "characters": "\u010F" },
  "&Dcy;": { "codepoints": [1044], "characters": "\u0414" },
  "&dcy;": { "codepoints": [1076], "characters": "\u0434" },
  "&ddagger;": { "codepoints": [8225], "characters": "\u2021" },
  "&ddarr;": { "codepoints": [8650], "characters": "\u21CA" },
  "&DD;": { "codepoints": [8517], "characters": "\u2145" },
  "&dd;": { "codepoints": [8518], "characters": "\u2146" },
  "&DDotrahd;": { "codepoints": [10513], "characters": "\u2911" },
  "&ddotseq;": { "codepoints": [10871], "characters": "\u2A77" },
  "&deg;": { "codepoints": [176], "characters": "\u00B0" },
  "&deg": { "codepoints": [176], "characters": "\u00B0" },
  "&Del;": { "codepoints": [8711], "characters": "\u2207" },
  "&Delta;": { "codepoints": [916], "characters": "\u0394" },
  "&delta;": { "codepoints": [948], "characters": "\u03B4" },
  "&demptyv;": { "codepoints": [10673], "characters": "\u29B1" },
  "&dfisht;": { "codepoints": [10623], "characters": "\u297F" },
  "&Dfr;": { "codepoints": [120071], "characters": "\uD835\uDD07" },
  "&dfr;": { "codepoints": [120097], "characters": "\uD835\uDD21" },
  "&dHar;": { "codepoints": [10597], "characters": "\u2965" },
  "&dharl;": { "codepoints": [8643], "characters": "\u21C3" },
  "&dharr;": { "codepoints": [8642], "characters": "\u21C2" },
  "&DiacriticalAcute;": { "codepoints": [180], "characters": "\u00B4" },
  "&DiacriticalDot;": { "codepoints": [729], "characters": "\u02D9" },
  "&DiacriticalDoubleAcute;": { "codepoints": [733], "characters": "\u02DD" },
  "&DiacriticalGrave;": { "codepoints": [96], "characters": "\u0060" },
  "&DiacriticalTilde;": { "codepoints": [732], "characters": "\u02DC" },
  "&diam;": { "codepoints": [8900], "characters": "\u22C4" },
  "&diamond;": { "codepoints": [8900], "characters": "\u22C4" },
  "&Diamond;": { "codepoints": [8900], "characters": "\u22C4" },
  "&diamondsuit;": { "codepoints": [9830], "characters": "\u2666" },
  "&diams;": { "codepoints": [9830], "characters": "\u2666" },
  "&die;": { "codepoints": [168], "characters": "\u00A8" },
  "&DifferentialD;": { "codepoints": [8518], "characters": "\u2146" },
  "&digamma;": { "codepoints": [989], "characters": "\u03DD" },
  "&disin;": { "codepoints": [8946], "characters": "\u22F2" },
  "&div;": { "codepoints": [247], "characters": "\u00F7" },
  "&divide;": { "codepoints": [247], "characters": "\u00F7" },
  "&divide": { "codepoints": [247], "characters": "\u00F7" },
  "&divideontimes;": { "codepoints": [8903], "characters": "\u22C7" },
  "&divonx;": { "codepoints": [8903], "characters": "\u22C7" },
  "&DJcy;": { "codepoints": [1026], "characters": "\u0402" },
  "&djcy;": { "codepoints": [1106], "characters": "\u0452" },
  "&dlcorn;": { "codepoints": [8990], "characters": "\u231E" },
  "&dlcrop;": { "codepoints": [8973], "characters": "\u230D" },
  "&dollar;": { "codepoints": [36], "characters": "\u0024" },
  "&Dopf;": { "codepoints": [120123], "characters": "\uD835\uDD3B" },
  "&dopf;": { "codepoints": [120149], "characters": "\uD835\uDD55" },
  "&Dot;": { "codepoints": [168], "characters": "\u00A8" },
  "&dot;": { "codepoints": [729], "characters": "\u02D9" },
  "&DotDot;": { "codepoints": [8412], "characters": "\u20DC" },
  "&doteq;": { "codepoints": [8784], "characters": "\u2250" },
  "&doteqdot;": { "codepoints": [8785], "characters": "\u2251" },
  "&DotEqual;": { "codepoints": [8784], "characters": "\u2250" },
  "&dotminus;": { "codepoints": [8760], "characters": "\u2238" },
  "&dotplus;": { "codepoints": [8724], "characters": "\u2214" },
  "&dotsquare;": { "codepoints": [8865], "characters": "\u22A1" },
  "&doublebarwedge;": { "codepoints": [8966], "characters": "\u2306" },
  "&DoubleContourIntegral;": { "codepoints": [8751], "characters": "\u222F" },
  "&DoubleDot;": { "codepoints": [168], "characters": "\u00A8" },
  "&DoubleDownArrow;": { "codepoints": [8659], "characters": "\u21D3" },
  "&DoubleLeftArrow;": { "codepoints": [8656], "characters": "\u21D0" },
  "&DoubleLeftRightArrow;": { "codepoints": [8660], "characters": "\u21D4" },
  "&DoubleLeftTee;": { "codepoints": [10980], "characters": "\u2AE4" },
  "&DoubleLongLeftArrow;": { "codepoints": [10232], "characters": "\u27F8" },
  "&DoubleLongLeftRightArrow;": { "codepoints": [10234], "characters": "\u27FA" },
  "&DoubleLongRightArrow;": { "codepoints": [10233], "characters": "\u27F9" },
  "&DoubleRightArrow;": { "codepoints": [8658], "characters": "\u21D2" },
  "&DoubleRightTee;": { "codepoints": [8872], "characters": "\u22A8" },
  "&DoubleUpArrow;": { "codepoints": [8657], "characters": "\u21D1" },
  "&DoubleUpDownArrow;": { "codepoints": [8661], "characters": "\u21D5" },
  "&DoubleVerticalBar;": { "codepoints": [8741], "characters": "\u2225" },
  "&DownArrowBar;": { "codepoints": [10515], "characters": "\u2913" },
  "&downarrow;": { "codepoints": [8595], "characters": "\u2193" },
  "&DownArrow;": { "codepoints": [8595], "characters": "\u2193" },
  "&Downarrow;": { "codepoints": [8659], "characters": "\u21D3" },
  "&DownArrowUpArrow;": { "codepoints": [8693], "characters": "\u21F5" },
  "&DownBreve;": { "codepoints": [785], "characters": "\u0311" },
  "&downdownarrows;": { "codepoints": [8650], "characters": "\u21CA" },
  "&downharpoonleft;": { "codepoints": [8643], "characters": "\u21C3" },
  "&downharpoonright;": { "codepoints": [8642], "characters": "\u21C2" },
  "&DownLeftRightVector;": { "codepoints": [10576], "characters": "\u2950" },
  "&DownLeftTeeVector;": { "codepoints": [10590], "characters": "\u295E" },
  "&DownLeftVectorBar;": { "codepoints": [10582], "characters": "\u2956" },
  "&DownLeftVector;": { "codepoints": [8637], "characters": "\u21BD" },
  "&DownRightTeeVector;": { "codepoints": [10591], "characters": "\u295F" },
  "&DownRightVectorBar;": { "codepoints": [10583], "characters": "\u2957" },
  "&DownRightVector;": { "codepoints": [8641], "characters": "\u21C1" },
  "&DownTeeArrow;": { "codepoints": [8615], "characters": "\u21A7" },
  "&DownTee;": { "codepoints": [8868], "characters": "\u22A4" },
  "&drbkarow;": { "codepoints": [10512], "characters": "\u2910" },
  "&drcorn;": { "codepoints": [8991], "characters": "\u231F" },
  "&drcrop;": { "codepoints": [8972], "characters": "\u230C" },
  "&Dscr;": { "codepoints": [119967], "characters": "\uD835\uDC9F" },
  "&dscr;": { "codepoints": [119993], "characters": "\uD835\uDCB9" },
  "&DScy;": { "codepoints": [1029], "characters": "\u0405" },
  "&dscy;": { "codepoints": [1109], "characters": "\u0455" },
  "&dsol;": { "codepoints": [10742], "characters": "\u29F6" },
  "&Dstrok;": { "codepoints": [272], "characters": "\u0110" },
  "&dstrok;": { "codepoints": [273], "characters": "\u0111" },
  "&dtdot;": { "codepoints": [8945], "characters": "\u22F1" },
  "&dtri;": { "codepoints": [9663], "characters": "\u25BF" },
  "&dtrif;": { "codepoints": [9662], "characters": "\u25BE" },
  "&duarr;": { "codepoints": [8693], "characters": "\u21F5" },
  "&duhar;": { "codepoints": [10607], "characters": "\u296F" },
  "&dwangle;": { "codepoints": [10662], "characters": "\u29A6" },
  "&DZcy;": { "codepoints": [1039], "characters": "\u040F" },
  "&dzcy;": { "codepoints": [1119], "characters": "\u045F" },
  "&dzigrarr;": { "codepoints": [10239], "characters": "\u27FF" },
  "&Eacute;": { "codepoints": [201], "characters": "\u00C9" },
  "&Eacute": { "codepoints": [201], "characters": "\u00C9" },
  "&eacute;": { "codepoints": [233], "characters": "\u00E9" },
  "&eacute": { "codepoints": [233], "characters": "\u00E9" },
  "&easter;": { "codepoints": [10862], "characters": "\u2A6E" },
  "&Ecaron;": { "codepoints": [282], "characters": "\u011A" },
  "&ecaron;": { "codepoints": [283], "characters": "\u011B" },
  "&Ecirc;": { "codepoints": [202], "characters": "\u00CA" },
  "&Ecirc": { "codepoints": [202], "characters": "\u00CA" },
  "&ecirc;": { "codepoints": [234], "characters": "\u00EA" },
  "&ecirc": { "codepoints": [234], "characters": "\u00EA" },
  "&ecir;": { "codepoints": [8790], "characters": "\u2256" },
  "&ecolon;": { "codepoints": [8789], "characters": "\u2255" },
  "&Ecy;": { "codepoints": [1069], "characters": "\u042D" },
  "&ecy;": { "codepoints": [1101], "characters": "\u044D" },
  "&eDDot;": { "codepoints": [10871], "characters": "\u2A77" },
  "&Edot;": { "codepoints": [278], "characters": "\u0116" },
  "&edot;": { "codepoints": [279], "characters": "\u0117" },
  "&eDot;": { "codepoints": [8785], "characters": "\u2251" },
  "&ee;": { "codepoints": [8519], "characters": "\u2147" },
  "&efDot;": { "codepoints": [8786], "characters": "\u2252" },
  "&Efr;": { "codepoints": [120072], "characters": "\uD835\uDD08" },
  "&efr;": { "codepoints": [120098], "characters": "\uD835\uDD22" },
  "&eg;": { "codepoints": [10906], "characters": "\u2A9A" },
  "&Egrave;": { "codepoints": [200], "characters": "\u00C8" },
  "&Egrave": { "codepoints": [200], "characters": "\u00C8" },
  "&egrave;": { "codepoints": [232], "characters": "\u00E8" },
  "&egrave": { "codepoints": [232], "characters": "\u00E8" },
  "&egs;": { "codepoints": [10902], "characters": "\u2A96" },
  "&egsdot;": { "codepoints": [10904], "characters": "\u2A98" },
  "&el;": { "codepoints": [10905], "characters": "\u2A99" },
  "&Element;": { "codepoints": [8712], "characters": "\u2208" },
  "&elinters;": { "codepoints": [9191], "characters": "\u23E7" },
  "&ell;": { "codepoints": [8467], "characters": "\u2113" },
  "&els;": { "codepoints": [10901], "characters": "\u2A95" },
  "&elsdot;": { "codepoints": [10903], "characters": "\u2A97" },
  "&Emacr;": { "codepoints": [274], "characters": "\u0112" },
  "&emacr;": { "codepoints": [275], "characters": "\u0113" },
  "&empty;": { "codepoints": [8709], "characters": "\u2205" },
  "&emptyset;": { "codepoints": [8709], "characters": "\u2205" },
  "&EmptySmallSquare;": { "codepoints": [9723], "characters": "\u25FB" },
  "&emptyv;": { "codepoints": [8709], "characters": "\u2205" },
  "&EmptyVerySmallSquare;": { "codepoints": [9643], "characters": "\u25AB" },
  "&emsp13;": { "codepoints": [8196], "characters": "\u2004" },
  "&emsp14;": { "codepoints": [8197], "characters": "\u2005" },
  "&emsp;": { "codepoints": [8195], "characters": "\u2003" },
  "&ENG;": { "codepoints": [330], "characters": "\u014A" },
  "&eng;": { "codepoints": [331], "characters": "\u014B" },
  "&ensp;": { "codepoints": [8194], "characters": "\u2002" },
  "&Eogon;": { "codepoints": [280], "characters": "\u0118" },
  "&eogon;": { "codepoints": [281], "characters": "\u0119" },
  "&Eopf;": { "codepoints": [120124], "characters": "\uD835\uDD3C" },
  "&eopf;": { "codepoints": [120150], "characters": "\uD835\uDD56" },
  "&epar;": { "codepoints": [8917], "characters": "\u22D5" },
  "&eparsl;": { "codepoints": [10723], "characters": "\u29E3" },
  "&eplus;": { "codepoints": [10865], "characters": "\u2A71" },
  "&epsi;": { "codepoints": [949], "characters": "\u03B5" },
  "&Epsilon;": { "codepoints": [917], "characters": "\u0395" },
  "&epsilon;": { "codepoints": [949], "characters": "\u03B5" },
  "&epsiv;": { "codepoints": [1013], "characters": "\u03F5" },
  "&eqcirc;": { "codepoints": [8790], "characters": "\u2256" },
  "&eqcolon;": { "codepoints": [8789], "characters": "\u2255" },
  "&eqsim;": { "codepoints": [8770], "characters": "\u2242" },
  "&eqslantgtr;": { "codepoints": [10902], "characters": "\u2A96" },
  "&eqslantless;": { "codepoints": [10901], "characters": "\u2A95" },
  "&Equal;": { "codepoints": [10869], "characters": "\u2A75" },
  "&equals;": { "codepoints": [61], "characters": "\u003D" },
  "&EqualTilde;": { "codepoints": [8770], "characters": "\u2242" },
  "&equest;": { "codepoints": [8799], "characters": "\u225F" },
  "&Equilibrium;": { "codepoints": [8652], "characters": "\u21CC" },
  "&equiv;": { "codepoints": [8801], "characters": "\u2261" },
  "&equivDD;": { "codepoints": [10872], "characters": "\u2A78" },
  "&eqvparsl;": { "codepoints": [10725], "characters": "\u29E5" },
  "&erarr;": { "codepoints": [10609], "characters": "\u2971" },
  "&erDot;": { "codepoints": [8787], "characters": "\u2253" },
  "&escr;": { "codepoints": [8495], "characters": "\u212F" },
  "&Escr;": { "codepoints": [8496], "characters": "\u2130" },
  "&esdot;": { "codepoints": [8784], "characters": "\u2250" },
  "&Esim;": { "codepoints": [10867], "characters": "\u2A73" },
  "&esim;": { "codepoints": [8770], "characters": "\u2242" },
  "&Eta;": { "codepoints": [919], "characters": "\u0397" },
  "&eta;": { "codepoints": [951], "characters": "\u03B7" },
  "&ETH;": { "codepoints": [208], "characters": "\u00D0" },
  "&ETH": { "codepoints": [208], "characters": "\u00D0" },
  "&eth;": { "codepoints": [240], "characters": "\u00F0" },
  "&eth": { "codepoints": [240], "characters": "\u00F0" },
  "&Euml;": { "codepoints": [203], "characters": "\u00CB" },
  "&Euml": { "codepoints": [203], "characters": "\u00CB" },
  "&euml;": { "codepoints": [235], "characters": "\u00EB" },
  "&euml": { "codepoints": [235], "characters": "\u00EB" },
  "&euro;": { "codepoints": [8364], "characters": "\u20AC" },
  "&excl;": { "codepoints": [33], "characters": "\u0021" },
  "&exist;": { "codepoints": [8707], "characters": "\u2203" },
  "&Exists;": { "codepoints": [8707], "characters": "\u2203" },
  "&expectation;": { "codepoints": [8496], "characters": "\u2130" },
  "&exponentiale;": { "codepoints": [8519], "characters": "\u2147" },
  "&ExponentialE;": { "codepoints": [8519], "characters": "\u2147" },
  "&fallingdotseq;": { "codepoints": [8786], "characters": "\u2252" },
  "&Fcy;": { "codepoints": [1060], "characters": "\u0424" },
  "&fcy;": { "codepoints": [1092], "characters": "\u0444" },
  "&female;": { "codepoints": [9792], "characters": "\u2640" },
  "&ffilig;": { "codepoints": [64259], "characters": "\uFB03" },
  "&fflig;": { "codepoints": [64256], "characters": "\uFB00" },
  "&ffllig;": { "codepoints": [64260], "characters": "\uFB04" },
  "&Ffr;": { "codepoints": [120073], "characters": "\uD835\uDD09" },
  "&ffr;": { "codepoints": [120099], "characters": "\uD835\uDD23" },
  "&filig;": { "codepoints": [64257], "characters": "\uFB01" },
  "&FilledSmallSquare;": { "codepoints": [9724], "characters": "\u25FC" },
  "&FilledVerySmallSquare;": { "codepoints": [9642], "characters": "\u25AA" },
  "&fjlig;": { "codepoints": [102, 106], "characters": "\u0066\u006A" },
  "&flat;": { "codepoints": [9837], "characters": "\u266D" },
  "&fllig;": { "codepoints": [64258], "characters": "\uFB02" },
  "&fltns;": { "codepoints": [9649], "characters": "\u25B1" },
  "&fnof;": { "codepoints": [402], "characters": "\u0192" },
  "&Fopf;": { "codepoints": [120125], "characters": "\uD835\uDD3D" },
  "&fopf;": { "codepoints": [120151], "characters": "\uD835\uDD57" },
  "&forall;": { "codepoints": [8704], "characters": "\u2200" },
  "&ForAll;": { "codepoints": [8704], "characters": "\u2200" },
  "&fork;": { "codepoints": [8916], "characters": "\u22D4" },
  "&forkv;": { "codepoints": [10969], "characters": "\u2AD9" },
  "&Fouriertrf;": { "codepoints": [8497], "characters": "\u2131" },
  "&fpartint;": { "codepoints": [10765], "characters": "\u2A0D" },
  "&frac12;": { "codepoints": [189], "characters": "\u00BD" },
  "&frac12": { "codepoints": [189], "characters": "\u00BD" },
  "&frac13;": { "codepoints": [8531], "characters": "\u2153" },
  "&frac14;": { "codepoints": [188], "characters": "\u00BC" },
  "&frac14": { "codepoints": [188], "characters": "\u00BC" },
  "&frac15;": { "codepoints": [8533], "characters": "\u2155" },
  "&frac16;": { "codepoints": [8537], "characters": "\u2159" },
  "&frac18;": { "codepoints": [8539], "characters": "\u215B" },
  "&frac23;": { "codepoints": [8532], "characters": "\u2154" },
  "&frac25;": { "codepoints": [8534], "characters": "\u2156" },
  "&frac34;": { "codepoints": [190], "characters": "\u00BE" },
  "&frac34": { "codepoints": [190], "characters": "\u00BE" },
  "&frac35;": { "codepoints": [8535], "characters": "\u2157" },
  "&frac38;": { "codepoints": [8540], "characters": "\u215C" },
  "&frac45;": { "codepoints": [8536], "characters": "\u2158" },
  "&frac56;": { "codepoints": [8538], "characters": "\u215A" },
  "&frac58;": { "codepoints": [8541], "characters": "\u215D" },
  "&frac78;": { "codepoints": [8542], "characters": "\u215E" },
  "&frasl;": { "codepoints": [8260], "characters": "\u2044" },
  "&frown;": { "codepoints": [8994], "characters": "\u2322" },
  "&fscr;": { "codepoints": [119995], "characters": "\uD835\uDCBB" },
  "&Fscr;": { "codepoints": [8497], "characters": "\u2131" },
  "&gacute;": { "codepoints": [501], "characters": "\u01F5" },
  "&Gamma;": { "codepoints": [915], "characters": "\u0393" },
  "&gamma;": { "codepoints": [947], "characters": "\u03B3" },
  "&Gammad;": { "codepoints": [988], "characters": "\u03DC" },
  "&gammad;": { "codepoints": [989], "characters": "\u03DD" },
  "&gap;": { "codepoints": [10886], "characters": "\u2A86" },
  "&Gbreve;": { "codepoints": [286], "characters": "\u011E" },
  "&gbreve;": { "codepoints": [287], "characters": "\u011F" },
  "&Gcedil;": { "codepoints": [290], "characters": "\u0122" },
  "&Gcirc;": { "codepoints": [284], "characters": "\u011C" },
  "&gcirc;": { "codepoints": [285], "characters": "\u011D" },
  "&Gcy;": { "codepoints": [1043], "characters": "\u0413" },
  "&gcy;": { "codepoints": [1075], "characters": "\u0433" },
  "&Gdot;": { "codepoints": [288], "characters": "\u0120" },
  "&gdot;": { "codepoints": [289], "characters": "\u0121" },
  "&ge;": { "codepoints": [8805], "characters": "\u2265" },
  "&gE;": { "codepoints": [8807], "characters": "\u2267" },
  "&gEl;": { "codepoints": [10892], "characters": "\u2A8C" },
  "&gel;": { "codepoints": [8923], "characters": "\u22DB" },
  "&geq;": { "codepoints": [8805], "characters": "\u2265" },
  "&geqq;": { "codepoints": [8807], "characters": "\u2267" },
  "&geqslant;": { "codepoints": [10878], "characters": "\u2A7E" },
  "&gescc;": { "codepoints": [10921], "characters": "\u2AA9" },
  "&ges;": { "codepoints": [10878], "characters": "\u2A7E" },
  "&gesdot;": { "codepoints": [10880], "characters": "\u2A80" },
  "&gesdoto;": { "codepoints": [10882], "characters": "\u2A82" },
  "&gesdotol;": { "codepoints": [10884], "characters": "\u2A84" },
  "&gesl;": { "codepoints": [8923, 65024], "characters": "\u22DB\uFE00" },
  "&gesles;": { "codepoints": [10900], "characters": "\u2A94" },
  "&Gfr;": { "codepoints": [120074], "characters": "\uD835\uDD0A" },
  "&gfr;": { "codepoints": [120100], "characters": "\uD835\uDD24" },
  "&gg;": { "codepoints": [8811], "characters": "\u226B" },
  "&Gg;": { "codepoints": [8921], "characters": "\u22D9" },
  "&ggg;": { "codepoints": [8921], "characters": "\u22D9" },
  "&gimel;": { "codepoints": [8503], "characters": "\u2137" },
  "&GJcy;": { "codepoints": [1027], "characters": "\u0403" },
  "&gjcy;": { "codepoints": [1107], "characters": "\u0453" },
  "&gla;": { "codepoints": [10917], "characters": "\u2AA5" },
  "&gl;": { "codepoints": [8823], "characters": "\u2277" },
  "&glE;": { "codepoints": [10898], "characters": "\u2A92" },
  "&glj;": { "codepoints": [10916], "characters": "\u2AA4" },
  "&gnap;": { "codepoints": [10890], "characters": "\u2A8A" },
  "&gnapprox;": { "codepoints": [10890], "characters": "\u2A8A" },
  "&gne;": { "codepoints": [10888], "characters": "\u2A88" },
  "&gnE;": { "codepoints": [8809], "characters": "\u2269" },
  "&gneq;": { "codepoints": [10888], "characters": "\u2A88" },
  "&gneqq;": { "codepoints": [8809], "characters": "\u2269" },
  "&gnsim;": { "codepoints": [8935], "characters": "\u22E7" },
  "&Gopf;": { "codepoints": [120126], "characters": "\uD835\uDD3E" },
  "&gopf;": { "codepoints": [120152], "characters": "\uD835\uDD58" },
  "&grave;": { "codepoints": [96], "characters": "\u0060" },
  "&GreaterEqual;": { "codepoints": [8805], "characters": "\u2265" },
  "&GreaterEqualLess;": { "codepoints": [8923], "characters": "\u22DB" },
  "&GreaterFullEqual;": { "codepoints": [8807], "characters": "\u2267" },
  "&GreaterGreater;": { "codepoints": [10914], "characters": "\u2AA2" },
  "&GreaterLess;": { "codepoints": [8823], "characters": "\u2277" },
  "&GreaterSlantEqual;": { "codepoints": [10878], "characters": "\u2A7E" },
  "&GreaterTilde;": { "codepoints": [8819], "characters": "\u2273" },
  "&Gscr;": { "codepoints": [119970], "characters": "\uD835\uDCA2" },
  "&gscr;": { "codepoints": [8458], "characters": "\u210A" },
  "&gsim;": { "codepoints": [8819], "characters": "\u2273" },
  "&gsime;": { "codepoints": [10894], "characters": "\u2A8E" },
  "&gsiml;": { "codepoints": [10896], "characters": "\u2A90" },
  "&gtcc;": { "codepoints": [10919], "characters": "\u2AA7" },
  "&gtcir;": { "codepoints": [10874], "characters": "\u2A7A" },
  "&gt;": { "codepoints": [62], "characters": "\u003E" },
  "&gt": { "codepoints": [62], "characters": "\u003E" },
  "&GT;": { "codepoints": [62], "characters": "\u003E" },
  "&GT": { "codepoints": [62], "characters": "\u003E" },
  "&Gt;": { "codepoints": [8811], "characters": "\u226B" },
  "&gtdot;": { "codepoints": [8919], "characters": "\u22D7" },
  "&gtlPar;": { "codepoints": [10645], "characters": "\u2995" },
  "&gtquest;": { "codepoints": [10876], "characters": "\u2A7C" },
  "&gtrapprox;": { "codepoints": [10886], "characters": "\u2A86" },
  "&gtrarr;": { "codepoints": [10616], "characters": "\u2978" },
  "&gtrdot;": { "codepoints": [8919], "characters": "\u22D7" },
  "&gtreqless;": { "codepoints": [8923], "characters": "\u22DB" },
  "&gtreqqless;": { "codepoints": [10892], "characters": "\u2A8C" },
  "&gtrless;": { "codepoints": [8823], "characters": "\u2277" },
  "&gtrsim;": { "codepoints": [8819], "characters": "\u2273" },
  "&gvertneqq;": { "codepoints": [8809, 65024], "characters": "\u2269\uFE00" },
  "&gvnE;": { "codepoints": [8809, 65024], "characters": "\u2269\uFE00" },
  "&Hacek;": { "codepoints": [711], "characters": "\u02C7" },
  "&hairsp;": { "codepoints": [8202], "characters": "\u200A" },
  "&half;": { "codepoints": [189], "characters": "\u00BD" },
  "&hamilt;": { "codepoints": [8459], "characters": "\u210B" },
  "&HARDcy;": { "codepoints": [1066], "characters": "\u042A" },
  "&hardcy;": { "codepoints": [1098], "characters": "\u044A" },
  "&harrcir;": { "codepoints": [10568], "characters": "\u2948" },
  "&harr;": { "codepoints": [8596], "characters": "\u2194" },
  "&hArr;": { "codepoints": [8660], "characters": "\u21D4" },
  "&harrw;": { "codepoints": [8621], "characters": "\u21AD" },
  "&Hat;": { "codepoints": [94], "characters": "\u005E" },
  "&hbar;": { "codepoints": [8463], "characters": "\u210F" },
  "&Hcirc;": { "codepoints": [292], "characters": "\u0124" },
  "&hcirc;": { "codepoints": [293], "characters": "\u0125" },
  "&hearts;": { "codepoints": [9829], "characters": "\u2665" },
  "&heartsuit;": { "codepoints": [9829], "characters": "\u2665" },
  "&hellip;": { "codepoints": [8230], "characters": "\u2026" },
  "&hercon;": { "codepoints": [8889], "characters": "\u22B9" },
  "&hfr;": { "codepoints": [120101], "characters": "\uD835\uDD25" },
  "&Hfr;": { "codepoints": [8460], "characters": "\u210C" },
  "&HilbertSpace;": { "codepoints": [8459], "characters": "\u210B" },
  "&hksearow;": { "codepoints": [10533], "characters": "\u2925" },
  "&hkswarow;": { "codepoints": [10534], "characters": "\u2926" },
  "&hoarr;": { "codepoints": [8703], "characters": "\u21FF" },
  "&homtht;": { "codepoints": [8763], "characters": "\u223B" },
  "&hookleftarrow;": { "codepoints": [8617], "characters": "\u21A9" },
  "&hookrightarrow;": { "codepoints": [8618], "characters": "\u21AA" },
  "&hopf;": { "codepoints": [120153], "characters": "\uD835\uDD59" },
  "&Hopf;": { "codepoints": [8461], "characters": "\u210D" },
  "&horbar;": { "codepoints": [8213], "characters": "\u2015" },
  "&HorizontalLine;": { "codepoints": [9472], "characters": "\u2500" },
  "&hscr;": { "codepoints": [119997], "characters": "\uD835\uDCBD" },
  "&Hscr;": { "codepoints": [8459], "characters": "\u210B" },
  "&hslash;": { "codepoints": [8463], "characters": "\u210F" },
  "&Hstrok;": { "codepoints": [294], "characters": "\u0126" },
  "&hstrok;": { "codepoints": [295], "characters": "\u0127" },
  "&HumpDownHump;": { "codepoints": [8782], "characters": "\u224E" },
  "&HumpEqual;": { "codepoints": [8783], "characters": "\u224F" },
  "&hybull;": { "codepoints": [8259], "characters": "\u2043" },
  "&hyphen;": { "codepoints": [8208], "characters": "\u2010" },
  "&Iacute;": { "codepoints": [205], "characters": "\u00CD" },
  "&Iacute": { "codepoints": [205], "characters": "\u00CD" },
  "&iacute;": { "codepoints": [237], "characters": "\u00ED" },
  "&iacute": { "codepoints": [237], "characters": "\u00ED" },
  "&ic;": { "codepoints": [8291], "characters": "\u2063" },
  "&Icirc;": { "codepoints": [206], "characters": "\u00CE" },
  "&Icirc": { "codepoints": [206], "characters": "\u00CE" },
  "&icirc;": { "codepoints": [238], "characters": "\u00EE" },
  "&icirc": { "codepoints": [238], "characters": "\u00EE" },
  "&Icy;": { "codepoints": [1048], "characters": "\u0418" },
  "&icy;": { "codepoints": [1080], "characters": "\u0438" },
  "&Idot;": { "codepoints": [304], "characters": "\u0130" },
  "&IEcy;": { "codepoints": [1045], "characters": "\u0415" },
  "&iecy;": { "codepoints": [1077], "characters": "\u0435" },
  "&iexcl;": { "codepoints": [161], "characters": "\u00A1" },
  "&iexcl": { "codepoints": [161], "characters": "\u00A1" },
  "&iff;": { "codepoints": [8660], "characters": "\u21D4" },
  "&ifr;": { "codepoints": [120102], "characters": "\uD835\uDD26" },
  "&Ifr;": { "codepoints": [8465], "characters": "\u2111" },
  "&Igrave;": { "codepoints": [204], "characters": "\u00CC" },
  "&Igrave": { "codepoints": [204], "characters": "\u00CC" },
  "&igrave;": { "codepoints": [236], "characters": "\u00EC" },
  "&igrave": { "codepoints": [236], "characters": "\u00EC" },
  "&ii;": { "codepoints": [8520], "characters": "\u2148" },
  "&iiiint;": { "codepoints": [10764], "characters": "\u2A0C" },
  "&iiint;": { "codepoints": [8749], "characters": "\u222D" },
  "&iinfin;": { "codepoints": [10716], "characters": "\u29DC" },
  "&iiota;": { "codepoints": [8489], "characters": "\u2129" },
  "&IJlig;": { "codepoints": [306], "characters": "\u0132" },
  "&ijlig;": { "codepoints": [307], "characters": "\u0133" },
  "&Imacr;": { "codepoints": [298], "characters": "\u012A" },
  "&imacr;": { "codepoints": [299], "characters": "\u012B" },
  "&image;": { "codepoints": [8465], "characters": "\u2111" },
  "&ImaginaryI;": { "codepoints": [8520], "characters": "\u2148" },
  "&imagline;": { "codepoints": [8464], "characters": "\u2110" },
  "&imagpart;": { "codepoints": [8465], "characters": "\u2111" },
  "&imath;": { "codepoints": [305], "characters": "\u0131" },
  "&Im;": { "codepoints": [8465], "characters": "\u2111" },
  "&imof;": { "codepoints": [8887], "characters": "\u22B7" },
  "&imped;": { "codepoints": [437], "characters": "\u01B5" },
  "&Implies;": { "codepoints": [8658], "characters": "\u21D2" },
  "&incare;": { "codepoints": [8453], "characters": "\u2105" },
  "&in;": { "codepoints": [8712], "characters": "\u2208" },
  "&infin;": { "codepoints": [8734], "characters": "\u221E" },
  "&infintie;": { "codepoints": [10717], "characters": "\u29DD" },
  "&inodot;": { "codepoints": [305], "characters": "\u0131" },
  "&intcal;": { "codepoints": [8890], "characters": "\u22BA" },
  "&int;": { "codepoints": [8747], "characters": "\u222B" },
  "&Int;": { "codepoints": [8748], "characters": "\u222C" },
  "&integers;": { "codepoints": [8484], "characters": "\u2124" },
  "&Integral;": { "codepoints": [8747], "characters": "\u222B" },
  "&intercal;": { "codepoints": [8890], "characters": "\u22BA" },
  "&Intersection;": { "codepoints": [8898], "characters": "\u22C2" },
  "&intlarhk;": { "codepoints": [10775], "characters": "\u2A17" },
  "&intprod;": { "codepoints": [10812], "characters": "\u2A3C" },
  "&InvisibleComma;": { "codepoints": [8291], "characters": "\u2063" },
  "&InvisibleTimes;": { "codepoints": [8290], "characters": "\u2062" },
  "&IOcy;": { "codepoints": [1025], "characters": "\u0401" },
  "&iocy;": { "codepoints": [1105], "characters": "\u0451" },
  "&Iogon;": { "codepoints": [302], "characters": "\u012E" },
  "&iogon;": { "codepoints": [303], "characters": "\u012F" },
  "&Iopf;": { "codepoints": [120128], "characters": "\uD835\uDD40" },
  "&iopf;": { "codepoints": [120154], "characters": "\uD835\uDD5A" },
  "&Iota;": { "codepoints": [921], "characters": "\u0399" },
  "&iota;": { "codepoints": [953], "characters": "\u03B9" },
  "&iprod;": { "codepoints": [10812], "characters": "\u2A3C" },
  "&iquest;": { "codepoints": [191], "characters": "\u00BF" },
  "&iquest": { "codepoints": [191], "characters": "\u00BF" },
  "&iscr;": { "codepoints": [119998], "characters": "\uD835\uDCBE" },
  "&Iscr;": { "codepoints": [8464], "characters": "\u2110" },
  "&isin;": { "codepoints": [8712], "characters": "\u2208" },
  "&isindot;": { "codepoints": [8949], "characters": "\u22F5" },
  "&isinE;": { "codepoints": [8953], "characters": "\u22F9" },
  "&isins;": { "codepoints": [8948], "characters": "\u22F4" },
  "&isinsv;": { "codepoints": [8947], "characters": "\u22F3" },
  "&isinv;": { "codepoints": [8712], "characters": "\u2208" },
  "&it;": { "codepoints": [8290], "characters": "\u2062" },
  "&Itilde;": { "codepoints": [296], "characters": "\u0128" },
  "&itilde;": { "codepoints": [297], "characters": "\u0129" },
  "&Iukcy;": { "codepoints": [1030], "characters": "\u0406" },
  "&iukcy;": { "codepoints": [1110], "characters": "\u0456" },
  "&Iuml;": { "codepoints": [207], "characters": "\u00CF" },
  "&Iuml": { "codepoints": [207], "characters": "\u00CF" },
  "&iuml;": { "codepoints": [239], "characters": "\u00EF" },
  "&iuml": { "codepoints": [239], "characters": "\u00EF" },
  "&Jcirc;": { "codepoints": [308], "characters": "\u0134" },
  "&jcirc;": { "codepoints": [309], "characters": "\u0135" },
  "&Jcy;": { "codepoints": [1049], "characters": "\u0419" },
  "&jcy;": { "codepoints": [1081], "characters": "\u0439" },
  "&Jfr;": { "codepoints": [120077], "characters": "\uD835\uDD0D" },
  "&jfr;": { "codepoints": [120103], "characters": "\uD835\uDD27" },
  "&jmath;": { "codepoints": [567], "characters": "\u0237" },
  "&Jopf;": { "codepoints": [120129], "characters": "\uD835\uDD41" },
  "&jopf;": { "codepoints": [120155], "characters": "\uD835\uDD5B" },
  "&Jscr;": { "codepoints": [119973], "characters": "\uD835\uDCA5" },
  "&jscr;": { "codepoints": [119999], "characters": "\uD835\uDCBF" },
  "&Jsercy;": { "codepoints": [1032], "characters": "\u0408" },
  "&jsercy;": { "codepoints": [1112], "characters": "\u0458" },
  "&Jukcy;": { "codepoints": [1028], "characters": "\u0404" },
  "&jukcy;": { "codepoints": [1108], "characters": "\u0454" },
  "&Kappa;": { "codepoints": [922], "characters": "\u039A" },
  "&kappa;": { "codepoints": [954], "characters": "\u03BA" },
  "&kappav;": { "codepoints": [1008], "characters": "\u03F0" },
  "&Kcedil;": { "codepoints": [310], "characters": "\u0136" },
  "&kcedil;": { "codepoints": [311], "characters": "\u0137" },
  "&Kcy;": { "codepoints": [1050], "characters": "\u041A" },
  "&kcy;": { "codepoints": [1082], "characters": "\u043A" },
  "&Kfr;": { "codepoints": [120078], "characters": "\uD835\uDD0E" },
  "&kfr;": { "codepoints": [120104], "characters": "\uD835\uDD28" },
  "&kgreen;": { "codepoints": [312], "characters": "\u0138" },
  "&KHcy;": { "codepoints": [1061], "characters": "\u0425" },
  "&khcy;": { "codepoints": [1093], "characters": "\u0445" },
  "&KJcy;": { "codepoints": [1036], "characters": "\u040C" },
  "&kjcy;": { "codepoints": [1116], "characters": "\u045C" },
  "&Kopf;": { "codepoints": [120130], "characters": "\uD835\uDD42" },
  "&kopf;": { "codepoints": [120156], "characters": "\uD835\uDD5C" },
  "&Kscr;": { "codepoints": [119974], "characters": "\uD835\uDCA6" },
  "&kscr;": { "codepoints": [120000], "characters": "\uD835\uDCC0" },
  "&lAarr;": { "codepoints": [8666], "characters": "\u21DA" },
  "&Lacute;": { "codepoints": [313], "characters": "\u0139" },
  "&lacute;": { "codepoints": [314], "characters": "\u013A" },
  "&laemptyv;": { "codepoints": [10676], "characters": "\u29B4" },
  "&lagran;": { "codepoints": [8466], "characters": "\u2112" },
  "&Lambda;": { "codepoints": [923], "characters": "\u039B" },
  "&lambda;": { "codepoints": [955], "characters": "\u03BB" },
  "&lang;": { "codepoints": [10216], "characters": "\u27E8" },
  "&Lang;": { "codepoints": [10218], "characters": "\u27EA" },
  "&langd;": { "codepoints": [10641], "characters": "\u2991" },
  "&langle;": { "codepoints": [10216], "characters": "\u27E8" },
  "&lap;": { "codepoints": [10885], "characters": "\u2A85" },
  "&Laplacetrf;": { "codepoints": [8466], "characters": "\u2112" },
  "&laquo;": { "codepoints": [171], "characters": "\u00AB" },
  "&laquo": { "codepoints": [171], "characters": "\u00AB" },
  "&larrb;": { "codepoints": [8676], "characters": "\u21E4" },
  "&larrbfs;": { "codepoints": [10527], "characters": "\u291F" },
  "&larr;": { "codepoints": [8592], "characters": "\u2190" },
  "&Larr;": { "codepoints": [8606], "characters": "\u219E" },
  "&lArr;": { "codepoints": [8656], "characters": "\u21D0" },
  "&larrfs;": { "codepoints": [10525], "characters": "\u291D" },
  "&larrhk;": { "codepoints": [8617], "characters": "\u21A9" },
  "&larrlp;": { "codepoints": [8619], "characters": "\u21AB" },
  "&larrpl;": { "codepoints": [10553], "characters": "\u2939" },
  "&larrsim;": { "codepoints": [10611], "characters": "\u2973" },
  "&larrtl;": { "codepoints": [8610], "characters": "\u21A2" },
  "&latail;": { "codepoints": [10521], "characters": "\u2919" },
  "&lAtail;": { "codepoints": [10523], "characters": "\u291B" },
  "&lat;": { "codepoints": [10923], "characters": "\u2AAB" },
  "&late;": { "codepoints": [10925], "characters": "\u2AAD" },
  "&lates;": { "codepoints": [10925, 65024], "characters": "\u2AAD\uFE00" },
  "&lbarr;": { "codepoints": [10508], "characters": "\u290C" },
  "&lBarr;": { "codepoints": [10510], "characters": "\u290E" },
  "&lbbrk;": { "codepoints": [10098], "characters": "\u2772" },
  "&lbrace;": { "codepoints": [123], "characters": "\u007B" },
  "&lbrack;": { "codepoints": [91], "characters": "\u005B" },
  "&lbrke;": { "codepoints": [10635], "characters": "\u298B" },
  "&lbrksld;": { "codepoints": [10639], "characters": "\u298F" },
  "&lbrkslu;": { "codepoints": [10637], "characters": "\u298D" },
  "&Lcaron;": { "codepoints": [317], "characters": "\u013D" },
  "&lcaron;": { "codepoints": [318], "characters": "\u013E" },
  "&Lcedil;": { "codepoints": [315], "characters": "\u013B" },
  "&lcedil;": { "codepoints": [316], "characters": "\u013C" },
  "&lceil;": { "codepoints": [8968], "characters": "\u2308" },
  "&lcub;": { "codepoints": [123], "characters": "\u007B" },
  "&Lcy;": { "codepoints": [1051], "characters": "\u041B" },
  "&lcy;": { "codepoints": [1083], "characters": "\u043B" },
  "&ldca;": { "codepoints": [10550], "characters": "\u2936" },
  "&ldquo;": { "codepoints": [8220], "characters": "\u201C" },
  "&ldquor;": { "codepoints": [8222], "characters": "\u201E" },
  "&ldrdhar;": { "codepoints": [10599], "characters": "\u2967" },
  "&ldrushar;": { "codepoints": [10571], "characters": "\u294B" },
  "&ldsh;": { "codepoints": [8626], "characters": "\u21B2" },
  "&le;": { "codepoints": [8804], "characters": "\u2264" },
  "&lE;": { "codepoints": [8806], "characters": "\u2266" },
  "&LeftAngleBracket;": { "codepoints": [10216], "characters": "\u27E8" },
  "&LeftArrowBar;": { "codepoints": [8676], "characters": "\u21E4" },
  "&leftarrow;": { "codepoints": [8592], "characters": "\u2190" },
  "&LeftArrow;": { "codepoints": [8592], "characters": "\u2190" },
  "&Leftarrow;": { "codepoints": [8656], "characters": "\u21D0" },
  "&LeftArrowRightArrow;": { "codepoints": [8646], "characters": "\u21C6" },
  "&leftarrowtail;": { "codepoints": [8610], "characters": "\u21A2" },
  "&LeftCeiling;": { "codepoints": [8968], "characters": "\u2308" },
  "&LeftDoubleBracket;": { "codepoints": [10214], "characters": "\u27E6" },
  "&LeftDownTeeVector;": { "codepoints": [10593], "characters": "\u2961" },
  "&LeftDownVectorBar;": { "codepoints": [10585], "characters": "\u2959" },
  "&LeftDownVector;": { "codepoints": [8643], "characters": "\u21C3" },
  "&LeftFloor;": { "codepoints": [8970], "characters": "\u230A" },
  "&leftharpoondown;": { "codepoints": [8637], "characters": "\u21BD" },
  "&leftharpoonup;": { "codepoints": [8636], "characters": "\u21BC" },
  "&leftleftarrows;": { "codepoints": [8647], "characters": "\u21C7" },
  "&leftrightarrow;": { "codepoints": [8596], "characters": "\u2194" },
  "&LeftRightArrow;": { "codepoints": [8596], "characters": "\u2194" },
  "&Leftrightarrow;": { "codepoints": [8660], "characters": "\u21D4" },
  "&leftrightarrows;": { "codepoints": [8646], "characters": "\u21C6" },
  "&leftrightharpoons;": { "codepoints": [8651], "characters": "\u21CB" },
  "&leftrightsquigarrow;": { "codepoints": [8621], "characters": "\u21AD" },
  "&LeftRightVector;": { "codepoints": [10574], "characters": "\u294E" },
  "&LeftTeeArrow;": { "codepoints": [8612], "characters": "\u21A4" },
  "&LeftTee;": { "codepoints": [8867], "characters": "\u22A3" },
  "&LeftTeeVector;": { "codepoints": [10586], "characters": "\u295A" },
  "&leftthreetimes;": { "codepoints": [8907], "characters": "\u22CB" },
  "&LeftTriangleBar;": { "codepoints": [10703], "characters": "\u29CF" },
  "&LeftTriangle;": { "codepoints": [8882], "characters": "\u22B2" },
  "&LeftTriangleEqual;": { "codepoints": [8884], "characters": "\u22B4" },
  "&LeftUpDownVector;": { "codepoints": [10577], "characters": "\u2951" },
  "&LeftUpTeeVector;": { "codepoints": [10592], "characters": "\u2960" },
  "&LeftUpVectorBar;": { "codepoints": [10584], "characters": "\u2958" },
  "&LeftUpVector;": { "codepoints": [8639], "characters": "\u21BF" },
  "&LeftVectorBar;": { "codepoints": [10578], "characters": "\u2952" },
  "&LeftVector;": { "codepoints": [8636], "characters": "\u21BC" },
  "&lEg;": { "codepoints": [10891], "characters": "\u2A8B" },
  "&leg;": { "codepoints": [8922], "characters": "\u22DA" },
  "&leq;": { "codepoints": [8804], "characters": "\u2264" },
  "&leqq;": { "codepoints": [8806], "characters": "\u2266" },
  "&leqslant;": { "codepoints": [10877], "characters": "\u2A7D" },
  "&lescc;": { "codepoints": [10920], "characters": "\u2AA8" },
  "&les;": { "codepoints": [10877], "characters": "\u2A7D" },
  "&lesdot;": { "codepoints": [10879], "characters": "\u2A7F" },
  "&lesdoto;": { "codepoints": [10881], "characters": "\u2A81" },
  "&lesdotor;": { "codepoints": [10883], "characters": "\u2A83" },
  "&lesg;": { "codepoints": [8922, 65024], "characters": "\u22DA\uFE00" },
  "&lesges;": { "codepoints": [10899], "characters": "\u2A93" },
  "&lessapprox;": { "codepoints": [10885], "characters": "\u2A85" },
  "&lessdot;": { "codepoints": [8918], "characters": "\u22D6" },
  "&lesseqgtr;": { "codepoints": [8922], "characters": "\u22DA" },
  "&lesseqqgtr;": { "codepoints": [10891], "characters": "\u2A8B" },
  "&LessEqualGreater;": { "codepoints": [8922], "characters": "\u22DA" },
  "&LessFullEqual;": { "codepoints": [8806], "characters": "\u2266" },
  "&LessGreater;": { "codepoints": [8822], "characters": "\u2276" },
  "&lessgtr;": { "codepoints": [8822], "characters": "\u2276" },
  "&LessLess;": { "codepoints": [10913], "characters": "\u2AA1" },
  "&lesssim;": { "codepoints": [8818], "characters": "\u2272" },
  "&LessSlantEqual;": { "codepoints": [10877], "characters": "\u2A7D" },
  "&LessTilde;": { "codepoints": [8818], "characters": "\u2272" },
  "&lfisht;": { "codepoints": [10620], "characters": "\u297C" },
  "&lfloor;": { "codepoints": [8970], "characters": "\u230A" },
  "&Lfr;": { "codepoints": [120079], "characters": "\uD835\uDD0F" },
  "&lfr;": { "codepoints": [120105], "characters": "\uD835\uDD29" },
  "&lg;": { "codepoints": [8822], "characters": "\u2276" },
  "&lgE;": { "codepoints": [10897], "characters": "\u2A91" },
  "&lHar;": { "codepoints": [10594], "characters": "\u2962" },
  "&lhard;": { "codepoints": [8637], "characters": "\u21BD" },
  "&lharu;": { "codepoints": [8636], "characters": "\u21BC" },
  "&lharul;": { "codepoints": [10602], "characters": "\u296A" },
  "&lhblk;": { "codepoints": [9604], "characters": "\u2584" },
  "&LJcy;": { "codepoints": [1033], "characters": "\u0409" },
  "&ljcy;": { "codepoints": [1113], "characters": "\u0459" },
  "&llarr;": { "codepoints": [8647], "characters": "\u21C7" },
  "&ll;": { "codepoints": [8810], "characters": "\u226A" },
  "&Ll;": { "codepoints": [8920], "characters": "\u22D8" },
  "&llcorner;": { "codepoints": [8990], "characters": "\u231E" },
  "&Lleftarrow;": { "codepoints": [8666], "characters": "\u21DA" },
  "&llhard;": { "codepoints": [10603], "characters": "\u296B" },
  "&lltri;": { "codepoints": [9722], "characters": "\u25FA" },
  "&Lmidot;": { "codepoints": [319], "characters": "\u013F" },
  "&lmidot;": { "codepoints": [320], "characters": "\u0140" },
  "&lmoustache;": { "codepoints": [9136], "characters": "\u23B0" },
  "&lmoust;": { "codepoints": [9136], "characters": "\u23B0" },
  "&lnap;": { "codepoints": [10889], "characters": "\u2A89" },
  "&lnapprox;": { "codepoints": [10889], "characters": "\u2A89" },
  "&lne;": { "codepoints": [10887], "characters": "\u2A87" },
  "&lnE;": { "codepoints": [8808], "characters": "\u2268" },
  "&lneq;": { "codepoints": [10887], "characters": "\u2A87" },
  "&lneqq;": { "codepoints": [8808], "characters": "\u2268" },
  "&lnsim;": { "codepoints": [8934], "characters": "\u22E6" },
  "&loang;": { "codepoints": [10220], "characters": "\u27EC" },
  "&loarr;": { "codepoints": [8701], "characters": "\u21FD" },
  "&lobrk;": { "codepoints": [10214], "characters": "\u27E6" },
  "&longleftarrow;": { "codepoints": [10229], "characters": "\u27F5" },
  "&LongLeftArrow;": { "codepoints": [10229], "characters": "\u27F5" },
  "&Longleftarrow;": { "codepoints": [10232], "characters": "\u27F8" },
  "&longleftrightarrow;": { "codepoints": [10231], "characters": "\u27F7" },
  "&LongLeftRightArrow;": { "codepoints": [10231], "characters": "\u27F7" },
  "&Longleftrightarrow;": { "codepoints": [10234], "characters": "\u27FA" },
  "&longmapsto;": { "codepoints": [10236], "characters": "\u27FC" },
  "&longrightarrow;": { "codepoints": [10230], "characters": "\u27F6" },
  "&LongRightArrow;": { "codepoints": [10230], "characters": "\u27F6" },
  "&Longrightarrow;": { "codepoints": [10233], "characters": "\u27F9" },
  "&looparrowleft;": { "codepoints": [8619], "characters": "\u21AB" },
  "&looparrowright;": { "codepoints": [8620], "characters": "\u21AC" },
  "&lopar;": { "codepoints": [10629], "characters": "\u2985" },
  "&Lopf;": { "codepoints": [120131], "characters": "\uD835\uDD43" },
  "&lopf;": { "codepoints": [120157], "characters": "\uD835\uDD5D" },
  "&loplus;": { "codepoints": [10797], "characters": "\u2A2D" },
  "&lotimes;": { "codepoints": [10804], "characters": "\u2A34" },
  "&lowast;": { "codepoints": [8727], "characters": "\u2217" },
  "&lowbar;": { "codepoints": [95], "characters": "\u005F" },
  "&LowerLeftArrow;": { "codepoints": [8601], "characters": "\u2199" },
  "&LowerRightArrow;": { "codepoints": [8600], "characters": "\u2198" },
  "&loz;": { "codepoints": [9674], "characters": "\u25CA" },
  "&lozenge;": { "codepoints": [9674], "characters": "\u25CA" },
  "&lozf;": { "codepoints": [10731], "characters": "\u29EB" },
  "&lpar;": { "codepoints": [40], "characters": "\u0028" },
  "&lparlt;": { "codepoints": [10643], "characters": "\u2993" },
  "&lrarr;": { "codepoints": [8646], "characters": "\u21C6" },
  "&lrcorner;": { "codepoints": [8991], "characters": "\u231F" },
  "&lrhar;": { "codepoints": [8651], "characters": "\u21CB" },
  "&lrhard;": { "codepoints": [10605], "characters": "\u296D" },
  "&lrm;": { "codepoints": [8206], "characters": "\u200E" },
  "&lrtri;": { "codepoints": [8895], "characters": "\u22BF" },
  "&lsaquo;": { "codepoints": [8249], "characters": "\u2039" },
  "&lscr;": { "codepoints": [120001], "characters": "\uD835\uDCC1" },
  "&Lscr;": { "codepoints": [8466], "characters": "\u2112" },
  "&lsh;": { "codepoints": [8624], "characters": "\u21B0" },
  "&Lsh;": { "codepoints": [8624], "characters": "\u21B0" },
  "&lsim;": { "codepoints": [8818], "characters": "\u2272" },
  "&lsime;": { "codepoints": [10893], "characters": "\u2A8D" },
  "&lsimg;": { "codepoints": [10895], "characters": "\u2A8F" },
  "&lsqb;": { "codepoints": [91], "characters": "\u005B" },
  "&lsquo;": { "codepoints": [8216], "characters": "\u2018" },
  "&lsquor;": { "codepoints": [8218], "characters": "\u201A" },
  "&Lstrok;": { "codepoints": [321], "characters": "\u0141" },
  "&lstrok;": { "codepoints": [322], "characters": "\u0142" },
  "&ltcc;": { "codepoints": [10918], "characters": "\u2AA6" },
  "&ltcir;": { "codepoints": [10873], "characters": "\u2A79" },
  "&lt;": { "codepoints": [60], "characters": "\u003C" },
  "&lt": { "codepoints": [60], "characters": "\u003C" },
  "&LT;": { "codepoints": [60], "characters": "\u003C" },
  "&LT": { "codepoints": [60], "characters": "\u003C" },
  "&Lt;": { "codepoints": [8810], "characters": "\u226A" },
  "&ltdot;": { "codepoints": [8918], "characters": "\u22D6" },
  "&lthree;": { "codepoints": [8907], "characters": "\u22CB" },
  "&ltimes;": { "codepoints": [8905], "characters": "\u22C9" },
  "&ltlarr;": { "codepoints": [10614], "characters": "\u2976" },
  "&ltquest;": { "codepoints": [10875], "characters": "\u2A7B" },
  "&ltri;": { "codepoints": [9667], "characters": "\u25C3" },
  "&ltrie;": { "codepoints": [8884], "characters": "\u22B4" },
  "&ltrif;": { "codepoints": [9666], "characters": "\u25C2" },
  "&ltrPar;": { "codepoints": [10646], "characters": "\u2996" },
  "&lurdshar;": { "codepoints": [10570], "characters": "\u294A" },
  "&luruhar;": { "codepoints": [10598], "characters": "\u2966" },
  "&lvertneqq;": { "codepoints": [8808, 65024], "characters": "\u2268\uFE00" },
  "&lvnE;": { "codepoints": [8808, 65024], "characters": "\u2268\uFE00" },
  "&macr;": { "codepoints": [175], "characters": "\u00AF" },
  "&macr": { "codepoints": [175], "characters": "\u00AF" },
  "&male;": { "codepoints": [9794], "characters": "\u2642" },
  "&malt;": { "codepoints": [10016], "characters": "\u2720" },
  "&maltese;": { "codepoints": [10016], "characters": "\u2720" },
  "&Map;": { "codepoints": [10501], "characters": "\u2905" },
  "&map;": { "codepoints": [8614], "characters": "\u21A6" },
  "&mapsto;": { "codepoints": [8614], "characters": "\u21A6" },
  "&mapstodown;": { "codepoints": [8615], "characters": "\u21A7" },
  "&mapstoleft;": { "codepoints": [8612], "characters": "\u21A4" },
  "&mapstoup;": { "codepoints": [8613], "characters": "\u21A5" },
  "&marker;": { "codepoints": [9646], "characters": "\u25AE" },
  "&mcomma;": { "codepoints": [10793], "characters": "\u2A29" },
  "&Mcy;": { "codepoints": [1052], "characters": "\u041C" },
  "&mcy;": { "codepoints": [1084], "characters": "\u043C" },
  "&mdash;": { "codepoints": [8212], "characters": "\u2014" },
  "&mDDot;": { "codepoints": [8762], "characters": "\u223A" },
  "&measuredangle;": { "codepoints": [8737], "characters": "\u2221" },
  "&MediumSpace;": { "codepoints": [8287], "characters": "\u205F" },
  "&Mellintrf;": { "codepoints": [8499], "characters": "\u2133" },
  "&Mfr;": { "codepoints": [120080], "characters": "\uD835\uDD10" },
  "&mfr;": { "codepoints": [120106], "characters": "\uD835\uDD2A" },
  "&mho;": { "codepoints": [8487], "characters": "\u2127" },
  "&micro;": { "codepoints": [181], "characters": "\u00B5" },
  "&micro": { "codepoints": [181], "characters": "\u00B5" },
  "&midast;": { "codepoints": [42], "characters": "\u002A" },
  "&midcir;": { "codepoints": [10992], "characters": "\u2AF0" },
  "&mid;": { "codepoints": [8739], "characters": "\u2223" },
  "&middot;": { "codepoints": [183], "characters": "\u00B7" },
  "&middot": { "codepoints": [183], "characters": "\u00B7" },
  "&minusb;": { "codepoints": [8863], "characters": "\u229F" },
  "&minus;": { "codepoints": [8722], "characters": "\u2212" },
  "&minusd;": { "codepoints": [8760], "characters": "\u2238" },
  "&minusdu;": { "codepoints": [10794], "characters": "\u2A2A" },
  "&MinusPlus;": { "codepoints": [8723], "characters": "\u2213" },
  "&mlcp;": { "codepoints": [10971], "characters": "\u2ADB" },
  "&mldr;": { "codepoints": [8230], "characters": "\u2026" },
  "&mnplus;": { "codepoints": [8723], "characters": "\u2213" },
  "&models;": { "codepoints": [8871], "characters": "\u22A7" },
  "&Mopf;": { "codepoints": [120132], "characters": "\uD835\uDD44" },
  "&mopf;": { "codepoints": [120158], "characters": "\uD835\uDD5E" },
  "&mp;": { "codepoints": [8723], "characters": "\u2213" },
  "&mscr;": { "codepoints": [120002], "characters": "\uD835\uDCC2" },
  "&Mscr;": { "codepoints": [8499], "characters": "\u2133" },
  "&mstpos;": { "codepoints": [8766], "characters": "\u223E" },
  "&Mu;": { "codepoints": [924], "characters": "\u039C" },
  "&mu;": { "codepoints": [956], "characters": "\u03BC" },
  "&multimap;": { "codepoints": [8888], "characters": "\u22B8" },
  "&mumap;": { "codepoints": [8888], "characters": "\u22B8" },
  "&nabla;": { "codepoints": [8711], "characters": "\u2207" },
  "&Nacute;": { "codepoints": [323], "characters": "\u0143" },
  "&nacute;": { "codepoints": [324], "characters": "\u0144" },
  "&nang;": { "codepoints": [8736, 8402], "characters": "\u2220\u20D2" },
  "&nap;": { "codepoints": [8777], "characters": "\u2249" },
  "&napE;": { "codepoints": [10864, 824], "characters": "\u2A70\u0338" },
  "&napid;": { "codepoints": [8779, 824], "characters": "\u224B\u0338" },
  "&napos;": { "codepoints": [329], "characters": "\u0149" },
  "&napprox;": { "codepoints": [8777], "characters": "\u2249" },
  "&natural;": { "codepoints": [9838], "characters": "\u266E" },
  "&naturals;": { "codepoints": [8469], "characters": "\u2115" },
  "&natur;": { "codepoints": [9838], "characters": "\u266E" },
  "&nbsp;": { "codepoints": [160], "characters": "\u00A0" },
  "&nbsp": { "codepoints": [160], "characters": "\u00A0" },
  "&nbump;": { "codepoints": [8782, 824], "characters": "\u224E\u0338" },
  "&nbumpe;": { "codepoints": [8783, 824], "characters": "\u224F\u0338" },
  "&ncap;": { "codepoints": [10819], "characters": "\u2A43" },
  "&Ncaron;": { "codepoints": [327], "characters": "\u0147" },
  "&ncaron;": { "codepoints": [328], "characters": "\u0148" },
  "&Ncedil;": { "codepoints": [325], "characters": "\u0145" },
  "&ncedil;": { "codepoints": [326], "characters": "\u0146" },
  "&ncong;": { "codepoints": [8775], "characters": "\u2247" },
  "&ncongdot;": { "codepoints": [10861, 824], "characters": "\u2A6D\u0338" },
  "&ncup;": { "codepoints": [10818], "characters": "\u2A42" },
  "&Ncy;": { "codepoints": [1053], "characters": "\u041D" },
  "&ncy;": { "codepoints": [1085], "characters": "\u043D" },
  "&ndash;": { "codepoints": [8211], "characters": "\u2013" },
  "&nearhk;": { "codepoints": [10532], "characters": "\u2924" },
  "&nearr;": { "codepoints": [8599], "characters": "\u2197" },
  "&neArr;": { "codepoints": [8663], "characters": "\u21D7" },
  "&nearrow;": { "codepoints": [8599], "characters": "\u2197" },
  "&ne;": { "codepoints": [8800], "characters": "\u2260" },
  "&nedot;": { "codepoints": [8784, 824], "characters": "\u2250\u0338" },
  "&NegativeMediumSpace;": { "codepoints": [8203], "characters": "\u200B" },
  "&NegativeThickSpace;": { "codepoints": [8203], "characters": "\u200B" },
  "&NegativeThinSpace;": { "codepoints": [8203], "characters": "\u200B" },
  "&NegativeVeryThinSpace;": { "codepoints": [8203], "characters": "\u200B" },
  "&nequiv;": { "codepoints": [8802], "characters": "\u2262" },
  "&nesear;": { "codepoints": [10536], "characters": "\u2928" },
  "&nesim;": { "codepoints": [8770, 824], "characters": "\u2242\u0338" },
  "&NestedGreaterGreater;": { "codepoints": [8811], "characters": "\u226B" },
  "&NestedLessLess;": { "codepoints": [8810], "characters": "\u226A" },
  "&NewLine;": { "codepoints": [10], "characters": "\u000A" },
  "&nexist;": { "codepoints": [8708], "characters": "\u2204" },
  "&nexists;": { "codepoints": [8708], "characters": "\u2204" },
  "&Nfr;": { "codepoints": [120081], "characters": "\uD835\uDD11" },
  "&nfr;": { "codepoints": [120107], "characters": "\uD835\uDD2B" },
  "&ngE;": { "codepoints": [8807, 824], "characters": "\u2267\u0338" },
  "&nge;": { "codepoints": [8817], "characters": "\u2271" },
  "&ngeq;": { "codepoints": [8817], "characters": "\u2271" },
  "&ngeqq;": { "codepoints": [8807, 824], "characters": "\u2267\u0338" },
  "&ngeqslant;": { "codepoints": [10878, 824], "characters": "\u2A7E\u0338" },
  "&nges;": { "codepoints": [10878, 824], "characters": "\u2A7E\u0338" },
  "&nGg;": { "codepoints": [8921, 824], "characters": "\u22D9\u0338" },
  "&ngsim;": { "codepoints": [8821], "characters": "\u2275" },
  "&nGt;": { "codepoints": [8811, 8402], "characters": "\u226B\u20D2" },
  "&ngt;": { "codepoints": [8815], "characters": "\u226F" },
  "&ngtr;": { "codepoints": [8815], "characters": "\u226F" },
  "&nGtv;": { "codepoints": [8811, 824], "characters": "\u226B\u0338" },
  "&nharr;": { "codepoints": [8622], "characters": "\u21AE" },
  "&nhArr;": { "codepoints": [8654], "characters": "\u21CE" },
  "&nhpar;": { "codepoints": [10994], "characters": "\u2AF2" },
  "&ni;": { "codepoints": [8715], "characters": "\u220B" },
  "&nis;": { "codepoints": [8956], "characters": "\u22FC" },
  "&nisd;": { "codepoints": [8954], "characters": "\u22FA" },
  "&niv;": { "codepoints": [8715], "characters": "\u220B" },
  "&NJcy;": { "codepoints": [1034], "characters": "\u040A" },
  "&njcy;": { "codepoints": [1114], "characters": "\u045A" },
  "&nlarr;": { "codepoints": [8602], "characters": "\u219A" },
  "&nlArr;": { "codepoints": [8653], "characters": "\u21CD" },
  "&nldr;": { "codepoints": [8229], "characters": "\u2025" },
  "&nlE;": { "codepoints": [8806, 824], "characters": "\u2266\u0338" },
  "&nle;": { "codepoints": [8816], "characters": "\u2270" },
  "&nleftarrow;": { "codepoints": [8602], "characters": "\u219A" },
  "&nLeftarrow;": { "codepoints": [8653], "characters": "\u21CD" },
  "&nleftrightarrow;": { "codepoints": [8622], "characters": "\u21AE" },
  "&nLeftrightarrow;": { "codepoints": [8654], "characters": "\u21CE" },
  "&nleq;": { "codepoints": [8816], "characters": "\u2270" },
  "&nleqq;": { "codepoints": [8806, 824], "characters": "\u2266\u0338" },
  "&nleqslant;": { "codepoints": [10877, 824], "characters": "\u2A7D\u0338" },
  "&nles;": { "codepoints": [10877, 824], "characters": "\u2A7D\u0338" },
  "&nless;": { "codepoints": [8814], "characters": "\u226E" },
  "&nLl;": { "codepoints": [8920, 824], "characters": "\u22D8\u0338" },
  "&nlsim;": { "codepoints": [8820], "characters": "\u2274" },
  "&nLt;": { "codepoints": [8810, 8402], "characters": "\u226A\u20D2" },
  "&nlt;": { "codepoints": [8814], "characters": "\u226E" },
  "&nltri;": { "codepoints": [8938], "characters": "\u22EA" },
  "&nltrie;": { "codepoints": [8940], "characters": "\u22EC" },
  "&nLtv;": { "codepoints": [8810, 824], "characters": "\u226A\u0338" },
  "&nmid;": { "codepoints": [8740], "characters": "\u2224" },
  "&NoBreak;": { "codepoints": [8288], "characters": "\u2060" },
  "&NonBreakingSpace;": { "codepoints": [160], "characters": "\u00A0" },
  "&nopf;": { "codepoints": [120159], "characters": "\uD835\uDD5F" },
  "&Nopf;": { "codepoints": [8469], "characters": "\u2115" },
  "&Not;": { "codepoints": [10988], "characters": "\u2AEC" },
  "&not;": { "codepoints": [172], "characters": "\u00AC" },
  "&not": { "codepoints": [172], "characters": "\u00AC" },
  "&NotCongruent;": { "codepoints": [8802], "characters": "\u2262" },
  "&NotCupCap;": { "codepoints": [8813], "characters": "\u226D" },
  "&NotDoubleVerticalBar;": { "codepoints": [8742], "characters": "\u2226" },
  "&NotElement;": { "codepoints": [8713], "characters": "\u2209" },
  "&NotEqual;": { "codepoints": [8800], "characters": "\u2260" },
  "&NotEqualTilde;": { "codepoints": [8770, 824], "characters": "\u2242\u0338" },
  "&NotExists;": { "codepoints": [8708], "characters": "\u2204" },
  "&NotGreater;": { "codepoints": [8815], "characters": "\u226F" },
  "&NotGreaterEqual;": { "codepoints": [8817], "characters": "\u2271" },
  "&NotGreaterFullEqual;": { "codepoints": [8807, 824], "characters": "\u2267\u0338" },
  "&NotGreaterGreater;": { "codepoints": [8811, 824], "characters": "\u226B\u0338" },
  "&NotGreaterLess;": { "codepoints": [8825], "characters": "\u2279" },
  "&NotGreaterSlantEqual;": { "codepoints": [10878, 824], "characters": "\u2A7E\u0338" },
  "&NotGreaterTilde;": { "codepoints": [8821], "characters": "\u2275" },
  "&NotHumpDownHump;": { "codepoints": [8782, 824], "characters": "\u224E\u0338" },
  "&NotHumpEqual;": { "codepoints": [8783, 824], "characters": "\u224F\u0338" },
  "&notin;": { "codepoints": [8713], "characters": "\u2209" },
  "&notindot;": { "codepoints": [8949, 824], "characters": "\u22F5\u0338" },
  "&notinE;": { "codepoints": [8953, 824], "characters": "\u22F9\u0338" },
  "&notinva;": { "codepoints": [8713], "characters": "\u2209" },
  "&notinvb;": { "codepoints": [8951], "characters": "\u22F7" },
  "&notinvc;": { "codepoints": [8950], "characters": "\u22F6" },
  "&NotLeftTriangleBar;": { "codepoints": [10703, 824], "characters": "\u29CF\u0338" },
  "&NotLeftTriangle;": { "codepoints": [8938], "characters": "\u22EA" },
  "&NotLeftTriangleEqual;": { "codepoints": [8940], "characters": "\u22EC" },
  "&NotLess;": { "codepoints": [8814], "characters": "\u226E" },
  "&NotLessEqual;": { "codepoints": [8816], "characters": "\u2270" },
  "&NotLessGreater;": { "codepoints": [8824], "characters": "\u2278" },
  "&NotLessLess;": { "codepoints": [8810, 824], "characters": "\u226A\u0338" },
  "&NotLessSlantEqual;": { "codepoints": [10877, 824], "characters": "\u2A7D\u0338" },
  "&NotLessTilde;": { "codepoints": [8820], "characters": "\u2274" },
  "&NotNestedGreaterGreater;": { "codepoints": [10914, 824], "characters": "\u2AA2\u0338" },
  "&NotNestedLessLess;": { "codepoints": [10913, 824], "characters": "\u2AA1\u0338" },
  "&notni;": { "codepoints": [8716], "characters": "\u220C" },
  "&notniva;": { "codepoints": [8716], "characters": "\u220C" },
  "&notnivb;": { "codepoints": [8958], "characters": "\u22FE" },
  "&notnivc;": { "codepoints": [8957], "characters": "\u22FD" },
  "&NotPrecedes;": { "codepoints": [8832], "characters": "\u2280" },
  "&NotPrecedesEqual;": { "codepoints": [10927, 824], "characters": "\u2AAF\u0338" },
  "&NotPrecedesSlantEqual;": { "codepoints": [8928], "characters": "\u22E0" },
  "&NotReverseElement;": { "codepoints": [8716], "characters": "\u220C" },
  "&NotRightTriangleBar;": { "codepoints": [10704, 824], "characters": "\u29D0\u0338" },
  "&NotRightTriangle;": { "codepoints": [8939], "characters": "\u22EB" },
  "&NotRightTriangleEqual;": { "codepoints": [8941], "characters": "\u22ED" },
  "&NotSquareSubset;": { "codepoints": [8847, 824], "characters": "\u228F\u0338" },
  "&NotSquareSubsetEqual;": { "codepoints": [8930], "characters": "\u22E2" },
  "&NotSquareSuperset;": { "codepoints": [8848, 824], "characters": "\u2290\u0338" },
  "&NotSquareSupersetEqual;": { "codepoints": [8931], "characters": "\u22E3" },
  "&NotSubset;": { "codepoints": [8834, 8402], "characters": "\u2282\u20D2" },
  "&NotSubsetEqual;": { "codepoints": [8840], "characters": "\u2288" },
  "&NotSucceeds;": { "codepoints": [8833], "characters": "\u2281" },
  "&NotSucceedsEqual;": { "codepoints": [10928, 824], "characters": "\u2AB0\u0338" },
  "&NotSucceedsSlantEqual;": { "codepoints": [8929], "characters": "\u22E1" },
  "&NotSucceedsTilde;": { "codepoints": [8831, 824], "characters": "\u227F\u0338" },
  "&NotSuperset;": { "codepoints": [8835, 8402], "characters": "\u2283\u20D2" },
  "&NotSupersetEqual;": { "codepoints": [8841], "characters": "\u2289" },
  "&NotTilde;": { "codepoints": [8769], "characters": "\u2241" },
  "&NotTildeEqual;": { "codepoints": [8772], "characters": "\u2244" },
  "&NotTildeFullEqual;": { "codepoints": [8775], "characters": "\u2247" },
  "&NotTildeTilde;": { "codepoints": [8777], "characters": "\u2249" },
  "&NotVerticalBar;": { "codepoints": [8740], "characters": "\u2224" },
  "&nparallel;": { "codepoints": [8742], "characters": "\u2226" },
  "&npar;": { "codepoints": [8742], "characters": "\u2226" },
  "&nparsl;": { "codepoints": [11005, 8421], "characters": "\u2AFD\u20E5" },
  "&npart;": { "codepoints": [8706, 824], "characters": "\u2202\u0338" },
  "&npolint;": { "codepoints": [10772], "characters": "\u2A14" },
  "&npr;": { "codepoints": [8832], "characters": "\u2280" },
  "&nprcue;": { "codepoints": [8928], "characters": "\u22E0" },
  "&nprec;": { "codepoints": [8832], "characters": "\u2280" },
  "&npreceq;": { "codepoints": [10927, 824], "characters": "\u2AAF\u0338" },
  "&npre;": { "codepoints": [10927, 824], "characters": "\u2AAF\u0338" },
  "&nrarrc;": { "codepoints": [10547, 824], "characters": "\u2933\u0338" },
  "&nrarr;": { "codepoints": [8603], "characters": "\u219B" },
  "&nrArr;": { "codepoints": [8655], "characters": "\u21CF" },
  "&nrarrw;": { "codepoints": [8605, 824], "characters": "\u219D\u0338" },
  "&nrightarrow;": { "codepoints": [8603], "characters": "\u219B" },
  "&nRightarrow;": { "codepoints": [8655], "characters": "\u21CF" },
  "&nrtri;": { "codepoints": [8939], "characters": "\u22EB" },
  "&nrtrie;": { "codepoints": [8941], "characters": "\u22ED" },
  "&nsc;": { "codepoints": [8833], "characters": "\u2281" },
  "&nsccue;": { "codepoints": [8929], "characters": "\u22E1" },
  "&nsce;": { "codepoints": [10928, 824], "characters": "\u2AB0\u0338" },
  "&Nscr;": { "codepoints": [119977], "characters": "\uD835\uDCA9" },
  "&nscr;": { "codepoints": [120003], "characters": "\uD835\uDCC3" },
  "&nshortmid;": { "codepoints": [8740], "characters": "\u2224" },
  "&nshortparallel;": { "codepoints": [8742], "characters": "\u2226" },
  "&nsim;": { "codepoints": [8769], "characters": "\u2241" },
  "&nsime;": { "codepoints": [8772], "characters": "\u2244" },
  "&nsimeq;": { "codepoints": [8772], "characters": "\u2244" },
  "&nsmid;": { "codepoints": [8740], "characters": "\u2224" },
  "&nspar;": { "codepoints": [8742], "characters": "\u2226" },
  "&nsqsube;": { "codepoints": [8930], "characters": "\u22E2" },
  "&nsqsupe;": { "codepoints": [8931], "characters": "\u22E3" },
  "&nsub;": { "codepoints": [8836], "characters": "\u2284" },
  "&nsubE;": { "codepoints": [10949, 824], "characters": "\u2AC5\u0338" },
  "&nsube;": { "codepoints": [8840], "characters": "\u2288" },
  "&nsubset;": { "codepoints": [8834, 8402], "characters": "\u2282\u20D2" },
  "&nsubseteq;": { "codepoints": [8840], "characters": "\u2288" },
  "&nsubseteqq;": { "codepoints": [10949, 824], "characters": "\u2AC5\u0338" },
  "&nsucc;": { "codepoints": [8833], "characters": "\u2281" },
  "&nsucceq;": { "codepoints": [10928, 824], "characters": "\u2AB0\u0338" },
  "&nsup;": { "codepoints": [8837], "characters": "\u2285" },
  "&nsupE;": { "codepoints": [10950, 824], "characters": "\u2AC6\u0338" },
  "&nsupe;": { "codepoints": [8841], "characters": "\u2289" },
  "&nsupset;": { "codepoints": [8835, 8402], "characters": "\u2283\u20D2" },
  "&nsupseteq;": { "codepoints": [8841], "characters": "\u2289" },
  "&nsupseteqq;": { "codepoints": [10950, 824], "characters": "\u2AC6\u0338" },
  "&ntgl;": { "codepoints": [8825], "characters": "\u2279" },
  "&Ntilde;": { "codepoints": [209], "characters": "\u00D1" },
  "&Ntilde": { "codepoints": [209], "characters": "\u00D1" },
  "&ntilde;": { "codepoints": [241], "characters": "\u00F1" },
  "&ntilde": { "codepoints": [241], "characters": "\u00F1" },
  "&ntlg;": { "codepoints": [8824], "characters": "\u2278" },
  "&ntriangleleft;": { "codepoints": [8938], "characters": "\u22EA" },
  "&ntrianglelefteq;": { "codepoints": [8940], "characters": "\u22EC" },
  "&ntriangleright;": { "codepoints": [8939], "characters": "\u22EB" },
  "&ntrianglerighteq;": { "codepoints": [8941], "characters": "\u22ED" },
  "&Nu;": { "codepoints": [925], "characters": "\u039D" },
  "&nu;": { "codepoints": [957], "characters": "\u03BD" },
  "&num;": { "codepoints": [35], "characters": "\u0023" },
  "&numero;": { "codepoints": [8470], "characters": "\u2116" },
  "&numsp;": { "codepoints": [8199], "characters": "\u2007" },
  "&nvap;": { "codepoints": [8781, 8402], "characters": "\u224D\u20D2" },
  "&nvdash;": { "codepoints": [8876], "characters": "\u22AC" },
  "&nvDash;": { "codepoints": [8877], "characters": "\u22AD" },
  "&nVdash;": { "codepoints": [8878], "characters": "\u22AE" },
  "&nVDash;": { "codepoints": [8879], "characters": "\u22AF" },
  "&nvge;": { "codepoints": [8805, 8402], "characters": "\u2265\u20D2" },
  "&nvgt;": { "codepoints": [62, 8402], "characters": "\u003E\u20D2" },
  "&nvHarr;": { "codepoints": [10500], "characters": "\u2904" },
  "&nvinfin;": { "codepoints": [10718], "characters": "\u29DE" },
  "&nvlArr;": { "codepoints": [10498], "characters": "\u2902" },
  "&nvle;": { "codepoints": [8804, 8402], "characters": "\u2264\u20D2" },
  "&nvlt;": { "codepoints": [60, 8402], "characters": "\u003C\u20D2" },
  "&nvltrie;": { "codepoints": [8884, 8402], "characters": "\u22B4\u20D2" },
  "&nvrArr;": { "codepoints": [10499], "characters": "\u2903" },
  "&nvrtrie;": { "codepoints": [8885, 8402], "characters": "\u22B5\u20D2" },
  "&nvsim;": { "codepoints": [8764, 8402], "characters": "\u223C\u20D2" },
  "&nwarhk;": { "codepoints": [10531], "characters": "\u2923" },
  "&nwarr;": { "codepoints": [8598], "characters": "\u2196" },
  "&nwArr;": { "codepoints": [8662], "characters": "\u21D6" },
  "&nwarrow;": { "codepoints": [8598], "characters": "\u2196" },
  "&nwnear;": { "codepoints": [10535], "characters": "\u2927" },
  "&Oacute;": { "codepoints": [211], "characters": "\u00D3" },
  "&Oacute": { "codepoints": [211], "characters": "\u00D3" },
  "&oacute;": { "codepoints": [243], "characters": "\u00F3" },
  "&oacute": { "codepoints": [243], "characters": "\u00F3" },
  "&oast;": { "codepoints": [8859], "characters": "\u229B" },
  "&Ocirc;": { "codepoints": [212], "characters": "\u00D4" },
  "&Ocirc": { "codepoints": [212], "characters": "\u00D4" },
  "&ocirc;": { "codepoints": [244], "characters": "\u00F4" },
  "&ocirc": { "codepoints": [244], "characters": "\u00F4" },
  "&ocir;": { "codepoints": [8858], "characters": "\u229A" },
  "&Ocy;": { "codepoints": [1054], "characters": "\u041E" },
  "&ocy;": { "codepoints": [1086], "characters": "\u043E" },
  "&odash;": { "codepoints": [8861], "characters": "\u229D" },
  "&Odblac;": { "codepoints": [336], "characters": "\u0150" },
  "&odblac;": { "codepoints": [337], "characters": "\u0151" },
  "&odiv;": { "codepoints": [10808], "characters": "\u2A38" },
  "&odot;": { "codepoints": [8857], "characters": "\u2299" },
  "&odsold;": { "codepoints": [10684], "characters": "\u29BC" },
  "&OElig;": { "codepoints": [338], "characters": "\u0152" },
  "&oelig;": { "codepoints": [339], "characters": "\u0153" },
  "&ofcir;": { "codepoints": [10687], "characters": "\u29BF" },
  "&Ofr;": { "codepoints": [120082], "characters": "\uD835\uDD12" },
  "&ofr;": { "codepoints": [120108], "characters": "\uD835\uDD2C" },
  "&ogon;": { "codepoints": [731], "characters": "\u02DB" },
  "&Ograve;": { "codepoints": [210], "characters": "\u00D2" },
  "&Ograve": { "codepoints": [210], "characters": "\u00D2" },
  "&ograve;": { "codepoints": [242], "characters": "\u00F2" },
  "&ograve": { "codepoints": [242], "characters": "\u00F2" },
  "&ogt;": { "codepoints": [10689], "characters": "\u29C1" },
  "&ohbar;": { "codepoints": [10677], "characters": "\u29B5" },
  "&ohm;": { "codepoints": [937], "characters": "\u03A9" },
  "&oint;": { "codepoints": [8750], "characters": "\u222E" },
  "&olarr;": { "codepoints": [8634], "characters": "\u21BA" },
  "&olcir;": { "codepoints": [10686], "characters": "\u29BE" },
  "&olcross;": { "codepoints": [10683], "characters": "\u29BB" },
  "&oline;": { "codepoints": [8254], "characters": "\u203E" },
  "&olt;": { "codepoints": [10688], "characters": "\u29C0" },
  "&Omacr;": { "codepoints": [332], "characters": "\u014C" },
  "&omacr;": { "codepoints": [333], "characters": "\u014D" },
  "&Omega;": { "codepoints": [937], "characters": "\u03A9" },
  "&omega;": { "codepoints": [969], "characters": "\u03C9" },
  "&Omicron;": { "codepoints": [927], "characters": "\u039F" },
  "&omicron;": { "codepoints": [959], "characters": "\u03BF" },
  "&omid;": { "codepoints": [10678], "characters": "\u29B6" },
  "&ominus;": { "codepoints": [8854], "characters": "\u2296" },
  "&Oopf;": { "codepoints": [120134], "characters": "\uD835\uDD46" },
  "&oopf;": { "codepoints": [120160], "characters": "\uD835\uDD60" },
  "&opar;": { "codepoints": [10679], "characters": "\u29B7" },
  "&OpenCurlyDoubleQuote;": { "codepoints": [8220], "characters": "\u201C" },
  "&OpenCurlyQuote;": { "codepoints": [8216], "characters": "\u2018" },
  "&operp;": { "codepoints": [10681], "characters": "\u29B9" },
  "&oplus;": { "codepoints": [8853], "characters": "\u2295" },
  "&orarr;": { "codepoints": [8635], "characters": "\u21BB" },
  "&Or;": { "codepoints": [10836], "characters": "\u2A54" },
  "&or;": { "codepoints": [8744], "characters": "\u2228" },
  "&ord;": { "codepoints": [10845], "characters": "\u2A5D" },
  "&order;": { "codepoints": [8500], "characters": "\u2134" },
  "&orderof;": { "codepoints": [8500], "characters": "\u2134" },
  "&ordf;": { "codepoints": [170], "characters": "\u00AA" },
  "&ordf": { "codepoints": [170], "characters": "\u00AA" },
  "&ordm;": { "codepoints": [186], "characters": "\u00BA" },
  "&ordm": { "codepoints": [186], "characters": "\u00BA" },
  "&origof;": { "codepoints": [8886], "characters": "\u22B6" },
  "&oror;": { "codepoints": [10838], "characters": "\u2A56" },
  "&orslope;": { "codepoints": [10839], "characters": "\u2A57" },
  "&orv;": { "codepoints": [10843], "characters": "\u2A5B" },
  "&oS;": { "codepoints": [9416], "characters": "\u24C8" },
  "&Oscr;": { "codepoints": [119978], "characters": "\uD835\uDCAA" },
  "&oscr;": { "codepoints": [8500], "characters": "\u2134" },
  "&Oslash;": { "codepoints": [216], "characters": "\u00D8" },
  "&Oslash": { "codepoints": [216], "characters": "\u00D8" },
  "&oslash;": { "codepoints": [248], "characters": "\u00F8" },
  "&oslash": { "codepoints": [248], "characters": "\u00F8" },
  "&osol;": { "codepoints": [8856], "characters": "\u2298" },
  "&Otilde;": { "codepoints": [213], "characters": "\u00D5" },
  "&Otilde": { "codepoints": [213], "characters": "\u00D5" },
  "&otilde;": { "codepoints": [245], "characters": "\u00F5" },
  "&otilde": { "codepoints": [245], "characters": "\u00F5" },
  "&otimesas;": { "codepoints": [10806], "characters": "\u2A36" },
  "&Otimes;": { "codepoints": [10807], "characters": "\u2A37" },
  "&otimes;": { "codepoints": [8855], "characters": "\u2297" },
  "&Ouml;": { "codepoints": [214], "characters": "\u00D6" },
  "&Ouml": { "codepoints": [214], "characters": "\u00D6" },
  "&ouml;": { "codepoints": [246], "characters": "\u00F6" },
  "&ouml": { "codepoints": [246], "characters": "\u00F6" },
  "&ovbar;": { "codepoints": [9021], "characters": "\u233D" },
  "&OverBar;": { "codepoints": [8254], "characters": "\u203E" },
  "&OverBrace;": { "codepoints": [9182], "characters": "\u23DE" },
  "&OverBracket;": { "codepoints": [9140], "characters": "\u23B4" },
  "&OverParenthesis;": { "codepoints": [9180], "characters": "\u23DC" },
  "&para;": { "codepoints": [182], "characters": "\u00B6" },
  "&para": { "codepoints": [182], "characters": "\u00B6" },
  "&parallel;": { "codepoints": [8741], "characters": "\u2225" },
  "&par;": { "codepoints": [8741], "characters": "\u2225" },
  "&parsim;": { "codepoints": [10995], "characters": "\u2AF3" },
  "&parsl;": { "codepoints": [11005], "characters": "\u2AFD" },
  "&part;": { "codepoints": [8706], "characters": "\u2202" },
  "&PartialD;": { "codepoints": [8706], "characters": "\u2202" },
  "&Pcy;": { "codepoints": [1055], "characters": "\u041F" },
  "&pcy;": { "codepoints": [1087], "characters": "\u043F" },
  "&percnt;": { "codepoints": [37], "characters": "\u0025" },
  "&period;": { "codepoints": [46], "characters": "\u002E" },
  "&permil;": { "codepoints": [8240], "characters": "\u2030" },
  "&perp;": { "codepoints": [8869], "characters": "\u22A5" },
  "&pertenk;": { "codepoints": [8241], "characters": "\u2031" },
  "&Pfr;": { "codepoints": [120083], "characters": "\uD835\uDD13" },
  "&pfr;": { "codepoints": [120109], "characters": "\uD835\uDD2D" },
  "&Phi;": { "codepoints": [934], "characters": "\u03A6" },
  "&phi;": { "codepoints": [966], "characters": "\u03C6" },
  "&phiv;": { "codepoints": [981], "characters": "\u03D5" },
  "&phmmat;": { "codepoints": [8499], "characters": "\u2133" },
  "&phone;": { "codepoints": [9742], "characters": "\u260E" },
  "&Pi;": { "codepoints": [928], "characters": "\u03A0" },
  "&pi;": { "codepoints": [960], "characters": "\u03C0" },
  "&pitchfork;": { "codepoints": [8916], "characters": "\u22D4" },
  "&piv;": { "codepoints": [982], "characters": "\u03D6" },
  "&planck;": { "codepoints": [8463], "characters": "\u210F" },
  "&planckh;": { "codepoints": [8462], "characters": "\u210E" },
  "&plankv;": { "codepoints": [8463], "characters": "\u210F" },
  "&plusacir;": { "codepoints": [10787], "characters": "\u2A23" },
  "&plusb;": { "codepoints": [8862], "characters": "\u229E" },
  "&pluscir;": { "codepoints": [10786], "characters": "\u2A22" },
  "&plus;": { "codepoints": [43], "characters": "\u002B" },
  "&plusdo;": { "codepoints": [8724], "characters": "\u2214" },
  "&plusdu;": { "codepoints": [10789], "characters": "\u2A25" },
  "&pluse;": { "codepoints": [10866], "characters": "\u2A72" },
  "&PlusMinus;": { "codepoints": [177], "characters": "\u00B1" },
  "&plusmn;": { "codepoints": [177], "characters": "\u00B1" },
  "&plusmn": { "codepoints": [177], "characters": "\u00B1" },
  "&plussim;": { "codepoints": [10790], "characters": "\u2A26" },
  "&plustwo;": { "codepoints": [10791], "characters": "\u2A27" },
  "&pm;": { "codepoints": [177], "characters": "\u00B1" },
  "&Poincareplane;": { "codepoints": [8460], "characters": "\u210C" },
  "&pointint;": { "codepoints": [10773], "characters": "\u2A15" },
  "&popf;": { "codepoints": [120161], "characters": "\uD835\uDD61" },
  "&Popf;": { "codepoints": [8473], "characters": "\u2119" },
  "&pound;": { "codepoints": [163], "characters": "\u00A3" },
  "&pound": { "codepoints": [163], "characters": "\u00A3" },
  "&prap;": { "codepoints": [10935], "characters": "\u2AB7" },
  "&Pr;": { "codepoints": [10939], "characters": "\u2ABB" },
  "&pr;": { "codepoints": [8826], "characters": "\u227A" },
  "&prcue;": { "codepoints": [8828], "characters": "\u227C" },
  "&precapprox;": { "codepoints": [10935], "characters": "\u2AB7" },
  "&prec;": { "codepoints": [8826], "characters": "\u227A" },
  "&preccurlyeq;": { "codepoints": [8828], "characters": "\u227C" },
  "&Precedes;": { "codepoints": [8826], "characters": "\u227A" },
  "&PrecedesEqual;": { "codepoints": [10927], "characters": "\u2AAF" },
  "&PrecedesSlantEqual;": { "codepoints": [8828], "characters": "\u227C" },
  "&PrecedesTilde;": { "codepoints": [8830], "characters": "\u227E" },
  "&preceq;": { "codepoints": [10927], "characters": "\u2AAF" },
  "&precnapprox;": { "codepoints": [10937], "characters": "\u2AB9" },
  "&precneqq;": { "codepoints": [10933], "characters": "\u2AB5" },
  "&precnsim;": { "codepoints": [8936], "characters": "\u22E8" },
  "&pre;": { "codepoints": [10927], "characters": "\u2AAF" },
  "&prE;": { "codepoints": [10931], "characters": "\u2AB3" },
  "&precsim;": { "codepoints": [8830], "characters": "\u227E" },
  "&prime;": { "codepoints": [8242], "characters": "\u2032" },
  "&Prime;": { "codepoints": [8243], "characters": "\u2033" },
  "&primes;": { "codepoints": [8473], "characters": "\u2119" },
  "&prnap;": { "codepoints": [10937], "characters": "\u2AB9" },
  "&prnE;": { "codepoints": [10933], "characters": "\u2AB5" },
  "&prnsim;": { "codepoints": [8936], "characters": "\u22E8" },
  "&prod;": { "codepoints": [8719], "characters": "\u220F" },
  "&Product;": { "codepoints": [8719], "characters": "\u220F" },
  "&profalar;": { "codepoints": [9006], "characters": "\u232E" },
  "&profline;": { "codepoints": [8978], "characters": "\u2312" },
  "&profsurf;": { "codepoints": [8979], "characters": "\u2313" },
  "&prop;": { "codepoints": [8733], "characters": "\u221D" },
  "&Proportional;": { "codepoints": [8733], "characters": "\u221D" },
  "&Proportion;": { "codepoints": [8759], "characters": "\u2237" },
  "&propto;": { "codepoints": [8733], "characters": "\u221D" },
  "&prsim;": { "codepoints": [8830], "characters": "\u227E" },
  "&prurel;": { "codepoints": [8880], "characters": "\u22B0" },
  "&Pscr;": { "codepoints": [119979], "characters": "\uD835\uDCAB" },
  "&pscr;": { "codepoints": [120005], "characters": "\uD835\uDCC5" },
  "&Psi;": { "codepoints": [936], "characters": "\u03A8" },
  "&psi;": { "codepoints": [968], "characters": "\u03C8" },
  "&puncsp;": { "codepoints": [8200], "characters": "\u2008" },
  "&Qfr;": { "codepoints": [120084], "characters": "\uD835\uDD14" },
  "&qfr;": { "codepoints": [120110], "characters": "\uD835\uDD2E" },
  "&qint;": { "codepoints": [10764], "characters": "\u2A0C" },
  "&qopf;": { "codepoints": [120162], "characters": "\uD835\uDD62" },
  "&Qopf;": { "codepoints": [8474], "characters": "\u211A" },
  "&qprime;": { "codepoints": [8279], "characters": "\u2057" },
  "&Qscr;": { "codepoints": [119980], "characters": "\uD835\uDCAC" },
  "&qscr;": { "codepoints": [120006], "characters": "\uD835\uDCC6" },
  "&quaternions;": { "codepoints": [8461], "characters": "\u210D" },
  "&quatint;": { "codepoints": [10774], "characters": "\u2A16" },
  "&quest;": { "codepoints": [63], "characters": "\u003F" },
  "&questeq;": { "codepoints": [8799], "characters": "\u225F" },
  "&quot;": { "codepoints": [34], "characters": "\u0022" },
  "&quot": { "codepoints": [34], "characters": "\u0022" },
  "&QUOT;": { "codepoints": [34], "characters": "\u0022" },
  "&QUOT": { "codepoints": [34], "characters": "\u0022" },
  "&rAarr;": { "codepoints": [8667], "characters": "\u21DB" },
  "&race;": { "codepoints": [8765, 817], "characters": "\u223D\u0331" },
  "&Racute;": { "codepoints": [340], "characters": "\u0154" },
  "&racute;": { "codepoints": [341], "characters": "\u0155" },
  "&radic;": { "codepoints": [8730], "characters": "\u221A" },
  "&raemptyv;": { "codepoints": [10675], "characters": "\u29B3" },
  "&rang;": { "codepoints": [10217], "characters": "\u27E9" },
  "&Rang;": { "codepoints": [10219], "characters": "\u27EB" },
  "&rangd;": { "codepoints": [10642], "characters": "\u2992" },
  "&range;": { "codepoints": [10661], "characters": "\u29A5" },
  "&rangle;": { "codepoints": [10217], "characters": "\u27E9" },
  "&raquo;": { "codepoints": [187], "characters": "\u00BB" },
  "&raquo": { "codepoints": [187], "characters": "\u00BB" },
  "&rarrap;": { "codepoints": [10613], "characters": "\u2975" },
  "&rarrb;": { "codepoints": [8677], "characters": "\u21E5" },
  "&rarrbfs;": { "codepoints": [10528], "characters": "\u2920" },
  "&rarrc;": { "codepoints": [10547], "characters": "\u2933" },
  "&rarr;": { "codepoints": [8594], "characters": "\u2192" },
  "&Rarr;": { "codepoints": [8608], "characters": "\u21A0" },
  "&rArr;": { "codepoints": [8658], "characters": "\u21D2" },
  "&rarrfs;": { "codepoints": [10526], "characters": "\u291E" },
  "&rarrhk;": { "codepoints": [8618], "characters": "\u21AA" },
  "&rarrlp;": { "codepoints": [8620], "characters": "\u21AC" },
  "&rarrpl;": { "codepoints": [10565], "characters": "\u2945" },
  "&rarrsim;": { "codepoints": [10612], "characters": "\u2974" },
  "&Rarrtl;": { "codepoints": [10518], "characters": "\u2916" },
  "&rarrtl;": { "codepoints": [8611], "characters": "\u21A3" },
  "&rarrw;": { "codepoints": [8605], "characters": "\u219D" },
  "&ratail;": { "codepoints": [10522], "characters": "\u291A" },
  "&rAtail;": { "codepoints": [10524], "characters": "\u291C" },
  "&ratio;": { "codepoints": [8758], "characters": "\u2236" },
  "&rationals;": { "codepoints": [8474], "characters": "\u211A" },
  "&rbarr;": { "codepoints": [10509], "characters": "\u290D" },
  "&rBarr;": { "codepoints": [10511], "characters": "\u290F" },
  "&RBarr;": { "codepoints": [10512], "characters": "\u2910" },
  "&rbbrk;": { "codepoints": [10099], "characters": "\u2773" },
  "&rbrace;": { "codepoints": [125], "characters": "\u007D" },
  "&rbrack;": { "codepoints": [93], "characters": "\u005D" },
  "&rbrke;": { "codepoints": [10636], "characters": "\u298C" },
  "&rbrksld;": { "codepoints": [10638], "characters": "\u298E" },
  "&rbrkslu;": { "codepoints": [10640], "characters": "\u2990" },
  "&Rcaron;": { "codepoints": [344], "characters": "\u0158" },
  "&rcaron;": { "codepoints": [345], "characters": "\u0159" },
  "&Rcedil;": { "codepoints": [342], "characters": "\u0156" },
  "&rcedil;": { "codepoints": [343], "characters": "\u0157" },
  "&rceil;": { "codepoints": [8969], "characters": "\u2309" },
  "&rcub;": { "codepoints": [125], "characters": "\u007D" },
  "&Rcy;": { "codepoints": [1056], "characters": "\u0420" },
  "&rcy;": { "codepoints": [1088], "characters": "\u0440" },
  "&rdca;": { "codepoints": [10551], "characters": "\u2937" },
  "&rdldhar;": { "codepoints": [10601], "characters": "\u2969" },
  "&rdquo;": { "codepoints": [8221], "characters": "\u201D" },
  "&rdquor;": { "codepoints": [8221], "characters": "\u201D" },
  "&rdsh;": { "codepoints": [8627], "characters": "\u21B3" },
  "&real;": { "codepoints": [8476], "characters": "\u211C" },
  "&realine;": { "codepoints": [8475], "characters": "\u211B" },
  "&realpart;": { "codepoints": [8476], "characters": "\u211C" },
  "&reals;": { "codepoints": [8477], "characters": "\u211D" },
  "&Re;": { "codepoints": [8476], "characters": "\u211C" },
  "&rect;": { "codepoints": [9645], "characters": "\u25AD" },
  "&reg;": { "codepoints": [174], "characters": "\u00AE" },
  "&reg": { "codepoints": [174], "characters": "\u00AE" },
  "&REG;": { "codepoints": [174], "characters": "\u00AE" },
  "&REG": { "codepoints": [174], "characters": "\u00AE" },
  "&ReverseElement;": { "codepoints": [8715], "characters": "\u220B" },
  "&ReverseEquilibrium;": { "codepoints": [8651], "characters": "\u21CB" },
  "&ReverseUpEquilibrium;": { "codepoints": [10607], "characters": "\u296F" },
  "&rfisht;": { "codepoints": [10621], "characters": "\u297D" },
  "&rfloor;": { "codepoints": [8971], "characters": "\u230B" },
  "&rfr;": { "codepoints": [120111], "characters": "\uD835\uDD2F" },
  "&Rfr;": { "codepoints": [8476], "characters": "\u211C" },
  "&rHar;": { "codepoints": [10596], "characters": "\u2964" },
  "&rhard;": { "codepoints": [8641], "characters": "\u21C1" },
  "&rharu;": { "codepoints": [8640], "characters": "\u21C0" },
  "&rharul;": { "codepoints": [10604], "characters": "\u296C" },
  "&Rho;": { "codepoints": [929], "characters": "\u03A1" },
  "&rho;": { "codepoints": [961], "characters": "\u03C1" },
  "&rhov;": { "codepoints": [1009], "characters": "\u03F1" },
  "&RightAngleBracket;": { "codepoints": [10217], "characters": "\u27E9" },
  "&RightArrowBar;": { "codepoints": [8677], "characters": "\u21E5" },
  "&rightarrow;": { "codepoints": [8594], "characters": "\u2192" },
  "&RightArrow;": { "codepoints": [8594], "characters": "\u2192" },
  "&Rightarrow;": { "codepoints": [8658], "characters": "\u21D2" },
  "&RightArrowLeftArrow;": { "codepoints": [8644], "characters": "\u21C4" },
  "&rightarrowtail;": { "codepoints": [8611], "characters": "\u21A3" },
  "&RightCeiling;": { "codepoints": [8969], "characters": "\u2309" },
  "&RightDoubleBracket;": { "codepoints": [10215], "characters": "\u27E7" },
  "&RightDownTeeVector;": { "codepoints": [10589], "characters": "\u295D" },
  "&RightDownVectorBar;": { "codepoints": [10581], "characters": "\u2955" },
  "&RightDownVector;": { "codepoints": [8642], "characters": "\u21C2" },
  "&RightFloor;": { "codepoints": [8971], "characters": "\u230B" },
  "&rightharpoondown;": { "codepoints": [8641], "characters": "\u21C1" },
  "&rightharpoonup;": { "codepoints": [8640], "characters": "\u21C0" },
  "&rightleftarrows;": { "codepoints": [8644], "characters": "\u21C4" },
  "&rightleftharpoons;": { "codepoints": [8652], "characters": "\u21CC" },
  "&rightrightarrows;": { "codepoints": [8649], "characters": "\u21C9" },
  "&rightsquigarrow;": { "codepoints": [8605], "characters": "\u219D" },
  "&RightTeeArrow;": { "codepoints": [8614], "characters": "\u21A6" },
  "&RightTee;": { "codepoints": [8866], "characters": "\u22A2" },
  "&RightTeeVector;": { "codepoints": [10587], "characters": "\u295B" },
  "&rightthreetimes;": { "codepoints": [8908], "characters": "\u22CC" },
  "&RightTriangleBar;": { "codepoints": [10704], "characters": "\u29D0" },
  "&RightTriangle;": { "codepoints": [8883], "characters": "\u22B3" },
  "&RightTriangleEqual;": { "codepoints": [8885], "characters": "\u22B5" },
  "&RightUpDownVector;": { "codepoints": [10575], "characters": "\u294F" },
  "&RightUpTeeVector;": { "codepoints": [10588], "characters": "\u295C" },
  "&RightUpVectorBar;": { "codepoints": [10580], "characters": "\u2954" },
  "&RightUpVector;": { "codepoints": [8638], "characters": "\u21BE" },
  "&RightVectorBar;": { "codepoints": [10579], "characters": "\u2953" },
  "&RightVector;": { "codepoints": [8640], "characters": "\u21C0" },
  "&ring;": { "codepoints": [730], "characters": "\u02DA" },
  "&risingdotseq;": { "codepoints": [8787], "characters": "\u2253" },
  "&rlarr;": { "codepoints": [8644], "characters": "\u21C4" },
  "&rlhar;": { "codepoints": [8652], "characters": "\u21CC" },
  "&rlm;": { "codepoints": [8207], "characters": "\u200F" },
  "&rmoustache;": { "codepoints": [9137], "characters": "\u23B1" },
  "&rmoust;": { "codepoints": [9137], "characters": "\u23B1" },
  "&rnmid;": { "codepoints": [10990], "characters": "\u2AEE" },
  "&roang;": { "codepoints": [10221], "characters": "\u27ED" },
  "&roarr;": { "codepoints": [8702], "characters": "\u21FE" },
  "&robrk;": { "codepoints": [10215], "characters": "\u27E7" },
  "&ropar;": { "codepoints": [10630], "characters": "\u2986" },
  "&ropf;": { "codepoints": [120163], "characters": "\uD835\uDD63" },
  "&Ropf;": { "codepoints": [8477], "characters": "\u211D" },
  "&roplus;": { "codepoints": [10798], "characters": "\u2A2E" },
  "&rotimes;": { "codepoints": [10805], "characters": "\u2A35" },
  "&RoundImplies;": { "codepoints": [10608], "characters": "\u2970" },
  "&rpar;": { "codepoints": [41], "characters": "\u0029" },
  "&rpargt;": { "codepoints": [10644], "characters": "\u2994" },
  "&rppolint;": { "codepoints": [10770], "characters": "\u2A12" },
  "&rrarr;": { "codepoints": [8649], "characters": "\u21C9" },
  "&Rrightarrow;": { "codepoints": [8667], "characters": "\u21DB" },
  "&rsaquo;": { "codepoints": [8250], "characters": "\u203A" },
  "&rscr;": { "codepoints": [120007], "characters": "\uD835\uDCC7" },
  "&Rscr;": { "codepoints": [8475], "characters": "\u211B" },
  "&rsh;": { "codepoints": [8625], "characters": "\u21B1" },
  "&Rsh;": { "codepoints": [8625], "characters": "\u21B1" },
  "&rsqb;": { "codepoints": [93], "characters": "\u005D" },
  "&rsquo;": { "codepoints": [8217], "characters": "\u2019" },
  "&rsquor;": { "codepoints": [8217], "characters": "\u2019" },
  "&rthree;": { "codepoints": [8908], "characters": "\u22CC" },
  "&rtimes;": { "codepoints": [8906], "characters": "\u22CA" },
  "&rtri;": { "codepoints": [9657], "characters": "\u25B9" },
  "&rtrie;": { "codepoints": [8885], "characters": "\u22B5" },
  "&rtrif;": { "codepoints": [9656], "characters": "\u25B8" },
  "&rtriltri;": { "codepoints": [10702], "characters": "\u29CE" },
  "&RuleDelayed;": { "codepoints": [10740], "characters": "\u29F4" },
  "&ruluhar;": { "codepoints": [10600], "characters": "\u2968" },
  "&rx;": { "codepoints": [8478], "characters": "\u211E" },
  "&Sacute;": { "codepoints": [346], "characters": "\u015A" },
  "&sacute;": { "codepoints": [347], "characters": "\u015B" },
  "&sbquo;": { "codepoints": [8218], "characters": "\u201A" },
  "&scap;": { "codepoints": [10936], "characters": "\u2AB8" },
  "&Scaron;": { "codepoints": [352], "characters": "\u0160" },
  "&scaron;": { "codepoints": [353], "characters": "\u0161" },
  "&Sc;": { "codepoints": [10940], "characters": "\u2ABC" },
  "&sc;": { "codepoints": [8827], "characters": "\u227B" },
  "&sccue;": { "codepoints": [8829], "characters": "\u227D" },
  "&sce;": { "codepoints": [10928], "characters": "\u2AB0" },
  "&scE;": { "codepoints": [10932], "characters": "\u2AB4" },
  "&Scedil;": { "codepoints": [350], "characters": "\u015E" },
  "&scedil;": { "codepoints": [351], "characters": "\u015F" },
  "&Scirc;": { "codepoints": [348], "characters": "\u015C" },
  "&scirc;": { "codepoints": [349], "characters": "\u015D" },
  "&scnap;": { "codepoints": [10938], "characters": "\u2ABA" },
  "&scnE;": { "codepoints": [10934], "characters": "\u2AB6" },
  "&scnsim;": { "codepoints": [8937], "characters": "\u22E9" },
  "&scpolint;": { "codepoints": [10771], "characters": "\u2A13" },
  "&scsim;": { "codepoints": [8831], "characters": "\u227F" },
  "&Scy;": { "codepoints": [1057], "characters": "\u0421" },
  "&scy;": { "codepoints": [1089], "characters": "\u0441" },
  "&sdotb;": { "codepoints": [8865], "characters": "\u22A1" },
  "&sdot;": { "codepoints": [8901], "characters": "\u22C5" },
  "&sdote;": { "codepoints": [10854], "characters": "\u2A66" },
  "&searhk;": { "codepoints": [10533], "characters": "\u2925" },
  "&searr;": { "codepoints": [8600], "characters": "\u2198" },
  "&seArr;": { "codepoints": [8664], "characters": "\u21D8" },
  "&searrow;": { "codepoints": [8600], "characters": "\u2198" },
  "&sect;": { "codepoints": [167], "characters": "\u00A7" },
  "&sect": { "codepoints": [167], "characters": "\u00A7" },
  "&semi;": { "codepoints": [59], "characters": "\u003B" },
  "&seswar;": { "codepoints": [10537], "characters": "\u2929" },
  "&setminus;": { "codepoints": [8726], "characters": "\u2216" },
  "&setmn;": { "codepoints": [8726], "characters": "\u2216" },
  "&sext;": { "codepoints": [10038], "characters": "\u2736" },
  "&Sfr;": { "codepoints": [120086], "characters": "\uD835\uDD16" },
  "&sfr;": { "codepoints": [120112], "characters": "\uD835\uDD30" },
  "&sfrown;": { "codepoints": [8994], "characters": "\u2322" },
  "&sharp;": { "codepoints": [9839], "characters": "\u266F" },
  "&SHCHcy;": { "codepoints": [1065], "characters": "\u0429" },
  "&shchcy;": { "codepoints": [1097], "characters": "\u0449" },
  "&SHcy;": { "codepoints": [1064], "characters": "\u0428" },
  "&shcy;": { "codepoints": [1096], "characters": "\u0448" },
  "&ShortDownArrow;": { "codepoints": [8595], "characters": "\u2193" },
  "&ShortLeftArrow;": { "codepoints": [8592], "characters": "\u2190" },
  "&shortmid;": { "codepoints": [8739], "characters": "\u2223" },
  "&shortparallel;": { "codepoints": [8741], "characters": "\u2225" },
  "&ShortRightArrow;": { "codepoints": [8594], "characters": "\u2192" },
  "&ShortUpArrow;": { "codepoints": [8593], "characters": "\u2191" },
  "&shy;": { "codepoints": [173], "characters": "\u00AD" },
  "&shy": { "codepoints": [173], "characters": "\u00AD" },
  "&Sigma;": { "codepoints": [931], "characters": "\u03A3" },
  "&sigma;": { "codepoints": [963], "characters": "\u03C3" },
  "&sigmaf;": { "codepoints": [962], "characters": "\u03C2" },
  "&sigmav;": { "codepoints": [962], "characters": "\u03C2" },
  "&sim;": { "codepoints": [8764], "characters": "\u223C" },
  "&simdot;": { "codepoints": [10858], "characters": "\u2A6A" },
  "&sime;": { "codepoints": [8771], "characters": "\u2243" },
  "&simeq;": { "codepoints": [8771], "characters": "\u2243" },
  "&simg;": { "codepoints": [10910], "characters": "\u2A9E" },
  "&simgE;": { "codepoints": [10912], "characters": "\u2AA0" },
  "&siml;": { "codepoints": [10909], "characters": "\u2A9D" },
  "&simlE;": { "codepoints": [10911], "characters": "\u2A9F" },
  "&simne;": { "codepoints": [8774], "characters": "\u2246" },
  "&simplus;": { "codepoints": [10788], "characters": "\u2A24" },
  "&simrarr;": { "codepoints": [10610], "characters": "\u2972" },
  "&slarr;": { "codepoints": [8592], "characters": "\u2190" },
  "&SmallCircle;": { "codepoints": [8728], "characters": "\u2218" },
  "&smallsetminus;": { "codepoints": [8726], "characters": "\u2216" },
  "&smashp;": { "codepoints": [10803], "characters": "\u2A33" },
  "&smeparsl;": { "codepoints": [10724], "characters": "\u29E4" },
  "&smid;": { "codepoints": [8739], "characters": "\u2223" },
  "&smile;": { "codepoints": [8995], "characters": "\u2323" },
  "&smt;": { "codepoints": [10922], "characters": "\u2AAA" },
  "&smte;": { "codepoints": [10924], "characters": "\u2AAC" },
  "&smtes;": { "codepoints": [10924, 65024], "characters": "\u2AAC\uFE00" },
  "&SOFTcy;": { "codepoints": [1068], "characters": "\u042C" },
  "&softcy;": { "codepoints": [1100], "characters": "\u044C" },
  "&solbar;": { "codepoints": [9023], "characters": "\u233F" },
  "&solb;": { "codepoints": [10692], "characters": "\u29C4" },
  "&sol;": { "codepoints": [47], "characters": "\u002F" },
  "&Sopf;": { "codepoints": [120138], "characters": "\uD835\uDD4A" },
  "&sopf;": { "codepoints": [120164], "characters": "\uD835\uDD64" },
  "&spades;": { "codepoints": [9824], "characters": "\u2660" },
  "&spadesuit;": { "codepoints": [9824], "characters": "\u2660" },
  "&spar;": { "codepoints": [8741], "characters": "\u2225" },
  "&sqcap;": { "codepoints": [8851], "characters": "\u2293" },
  "&sqcaps;": { "codepoints": [8851, 65024], "characters": "\u2293\uFE00" },
  "&sqcup;": { "codepoints": [8852], "characters": "\u2294" },
  "&sqcups;": { "codepoints": [8852, 65024], "characters": "\u2294\uFE00" },
  "&Sqrt;": { "codepoints": [8730], "characters": "\u221A" },
  "&sqsub;": { "codepoints": [8847], "characters": "\u228F" },
  "&sqsube;": { "codepoints": [8849], "characters": "\u2291" },
  "&sqsubset;": { "codepoints": [8847], "characters": "\u228F" },
  "&sqsubseteq;": { "codepoints": [8849], "characters": "\u2291" },
  "&sqsup;": { "codepoints": [8848], "characters": "\u2290" },
  "&sqsupe;": { "codepoints": [8850], "characters": "\u2292" },
  "&sqsupset;": { "codepoints": [8848], "characters": "\u2290" },
  "&sqsupseteq;": { "codepoints": [8850], "characters": "\u2292" },
  "&square;": { "codepoints": [9633], "characters": "\u25A1" },
  "&Square;": { "codepoints": [9633], "characters": "\u25A1" },
  "&SquareIntersection;": { "codepoints": [8851], "characters": "\u2293" },
  "&SquareSubset;": { "codepoints": [8847], "characters": "\u228F" },
  "&SquareSubsetEqual;": { "codepoints": [8849], "characters": "\u2291" },
  "&SquareSuperset;": { "codepoints": [8848], "characters": "\u2290" },
  "&SquareSupersetEqual;": { "codepoints": [8850], "characters": "\u2292" },
  "&SquareUnion;": { "codepoints": [8852], "characters": "\u2294" },
  "&squarf;": { "codepoints": [9642], "characters": "\u25AA" },
  "&squ;": { "codepoints": [9633], "characters": "\u25A1" },
  "&squf;": { "codepoints": [9642], "characters": "\u25AA" },
  "&srarr;": { "codepoints": [8594], "characters": "\u2192" },
  "&Sscr;": { "codepoints": [119982], "characters": "\uD835\uDCAE" },
  "&sscr;": { "codepoints": [120008], "characters": "\uD835\uDCC8" },
  "&ssetmn;": { "codepoints": [8726], "characters": "\u2216" },
  "&ssmile;": { "codepoints": [8995], "characters": "\u2323" },
  "&sstarf;": { "codepoints": [8902], "characters": "\u22C6" },
  "&Star;": { "codepoints": [8902], "characters": "\u22C6" },
  "&star;": { "codepoints": [9734], "characters": "\u2606" },
  "&starf;": { "codepoints": [9733], "characters": "\u2605" },
  "&straightepsilon;": { "codepoints": [1013], "characters": "\u03F5" },
  "&straightphi;": { "codepoints": [981], "characters": "\u03D5" },
  "&strns;": { "codepoints": [175], "characters": "\u00AF" },
  "&sub;": { "codepoints": [8834], "characters": "\u2282" },
  "&Sub;": { "codepoints": [8912], "characters": "\u22D0" },
  "&subdot;": { "codepoints": [10941], "characters": "\u2ABD" },
  "&subE;": { "codepoints": [10949], "characters": "\u2AC5" },
  "&sube;": { "codepoints": [8838], "characters": "\u2286" },
  "&subedot;": { "codepoints": [10947], "characters": "\u2AC3" },
  "&submult;": { "codepoints": [10945], "characters": "\u2AC1" },
  "&subnE;": { "codepoints": [10955], "characters": "\u2ACB" },
  "&subne;": { "codepoints": [8842], "characters": "\u228A" },
  "&subplus;": { "codepoints": [10943], "characters": "\u2ABF" },
  "&subrarr;": { "codepoints": [10617], "characters": "\u2979" },
  "&subset;": { "codepoints": [8834], "characters": "\u2282" },
  "&Subset;": { "codepoints": [8912], "characters": "\u22D0" },
  "&subseteq;": { "codepoints": [8838], "characters": "\u2286" },
  "&subseteqq;": { "codepoints": [10949], "characters": "\u2AC5" },
  "&SubsetEqual;": { "codepoints": [8838], "characters": "\u2286" },
  "&subsetneq;": { "codepoints": [8842], "characters": "\u228A" },
  "&subsetneqq;": { "codepoints": [10955], "characters": "\u2ACB" },
  "&subsim;": { "codepoints": [10951], "characters": "\u2AC7" },
  "&subsub;": { "codepoints": [10965], "characters": "\u2AD5" },
  "&subsup;": { "codepoints": [10963], "characters": "\u2AD3" },
  "&succapprox;": { "codepoints": [10936], "characters": "\u2AB8" },
  "&succ;": { "codepoints": [8827], "characters": "\u227B" },
  "&succcurlyeq;": { "codepoints": [8829], "characters": "\u227D" },
  "&Succeeds;": { "codepoints": [8827], "characters": "\u227B" },
  "&SucceedsEqual;": { "codepoints": [10928], "characters": "\u2AB0" },
  "&SucceedsSlantEqual;": { "codepoints": [8829], "characters": "\u227D" },
  "&SucceedsTilde;": { "codepoints": [8831], "characters": "\u227F" },
  "&succeq;": { "codepoints": [10928], "characters": "\u2AB0" },
  "&succnapprox;": { "codepoints": [10938], "characters": "\u2ABA" },
  "&succneqq;": { "codepoints": [10934], "characters": "\u2AB6" },
  "&succnsim;": { "codepoints": [8937], "characters": "\u22E9" },
  "&succsim;": { "codepoints": [8831], "characters": "\u227F" },
  "&SuchThat;": { "codepoints": [8715], "characters": "\u220B" },
  "&sum;": { "codepoints": [8721], "characters": "\u2211" },
  "&Sum;": { "codepoints": [8721], "characters": "\u2211" },
  "&sung;": { "codepoints": [9834], "characters": "\u266A" },
  "&sup1;": { "codepoints": [185], "characters": "\u00B9" },
  "&sup1": { "codepoints": [185], "characters": "\u00B9" },
  "&sup2;": { "codepoints": [178], "characters": "\u00B2" },
  "&sup2": { "codepoints": [178], "characters": "\u00B2" },
  "&sup3;": { "codepoints": [179], "characters": "\u00B3" },
  "&sup3": { "codepoints": [179], "characters": "\u00B3" },
  "&sup;": { "codepoints": [8835], "characters": "\u2283" },
  "&Sup;": { "codepoints": [8913], "characters": "\u22D1" },
  "&supdot;": { "codepoints": [10942], "characters": "\u2ABE" },
  "&supdsub;": { "codepoints": [10968], "characters": "\u2AD8" },
  "&supE;": { "codepoints": [10950], "characters": "\u2AC6" },
  "&supe;": { "codepoints": [8839], "characters": "\u2287" },
  "&supedot;": { "codepoints": [10948], "characters": "\u2AC4" },
  "&Superset;": { "codepoints": [8835], "characters": "\u2283" },
  "&SupersetEqual;": { "codepoints": [8839], "characters": "\u2287" },
  "&suphsol;": { "codepoints": [10185], "characters": "\u27C9" },
  "&suphsub;": { "codepoints": [10967], "characters": "\u2AD7" },
  "&suplarr;": { "codepoints": [10619], "characters": "\u297B" },
  "&supmult;": { "codepoints": [10946], "characters": "\u2AC2" },
  "&supnE;": { "codepoints": [10956], "characters": "\u2ACC" },
  "&supne;": { "codepoints": [8843], "characters": "\u228B" },
  "&supplus;": { "codepoints": [10944], "characters": "\u2AC0" },
  "&supset;": { "codepoints": [8835], "characters": "\u2283" },
  "&Supset;": { "codepoints": [8913], "characters": "\u22D1" },
  "&supseteq;": { "codepoints": [8839], "characters": "\u2287" },
  "&supseteqq;": { "codepoints": [10950], "characters": "\u2AC6" },
  "&supsetneq;": { "codepoints": [8843], "characters": "\u228B" },
  "&supsetneqq;": { "codepoints": [10956], "characters": "\u2ACC" },
  "&supsim;": { "codepoints": [10952], "characters": "\u2AC8" },
  "&supsub;": { "codepoints": [10964], "characters": "\u2AD4" },
  "&supsup;": { "codepoints": [10966], "characters": "\u2AD6" },
  "&swarhk;": { "codepoints": [10534], "characters": "\u2926" },
  "&swarr;": { "codepoints": [8601], "characters": "\u2199" },
  "&swArr;": { "codepoints": [8665], "characters": "\u21D9" },
  "&swarrow;": { "codepoints": [8601], "characters": "\u2199" },
  "&swnwar;": { "codepoints": [10538], "characters": "\u292A" },
  "&szlig;": { "codepoints": [223], "characters": "\u00DF" },
  "&szlig": { "codepoints": [223], "characters": "\u00DF" },
  "&Tab;": { "codepoints": [9], "characters": "\u0009" },
  "&target;": { "codepoints": [8982], "characters": "\u2316" },
  "&Tau;": { "codepoints": [932], "characters": "\u03A4" },
  "&tau;": { "codepoints": [964], "characters": "\u03C4" },
  "&tbrk;": { "codepoints": [9140], "characters": "\u23B4" },
  "&Tcaron;": { "codepoints": [356], "characters": "\u0164" },
  "&tcaron;": { "codepoints": [357], "characters": "\u0165" },
  "&Tcedil;": { "codepoints": [354], "characters": "\u0162" },
  "&tcedil;": { "codepoints": [355], "characters": "\u0163" },
  "&Tcy;": { "codepoints": [1058], "characters": "\u0422" },
  "&tcy;": { "codepoints": [1090], "characters": "\u0442" },
  "&tdot;": { "codepoints": [8411], "characters": "\u20DB" },
  "&telrec;": { "codepoints": [8981], "characters": "\u2315" },
  "&Tfr;": { "codepoints": [120087], "characters": "\uD835\uDD17" },
  "&tfr;": { "codepoints": [120113], "characters": "\uD835\uDD31" },
  "&there4;": { "codepoints": [8756], "characters": "\u2234" },
  "&therefore;": { "codepoints": [8756], "characters": "\u2234" },
  "&Therefore;": { "codepoints": [8756], "characters": "\u2234" },
  "&Theta;": { "codepoints": [920], "characters": "\u0398" },
  "&theta;": { "codepoints": [952], "characters": "\u03B8" },
  "&thetasym;": { "codepoints": [977], "characters": "\u03D1" },
  "&thetav;": { "codepoints": [977], "characters": "\u03D1" },
  "&thickapprox;": { "codepoints": [8776], "characters": "\u2248" },
  "&thicksim;": { "codepoints": [8764], "characters": "\u223C" },
  "&ThickSpace;": { "codepoints": [8287, 8202], "characters": "\u205F\u200A" },
  "&ThinSpace;": { "codepoints": [8201], "characters": "\u2009" },
  "&thinsp;": { "codepoints": [8201], "characters": "\u2009" },
  "&thkap;": { "codepoints": [8776], "characters": "\u2248" },
  "&thksim;": { "codepoints": [8764], "characters": "\u223C" },
  "&THORN;": { "codepoints": [222], "characters": "\u00DE" },
  "&THORN": { "codepoints": [222], "characters": "\u00DE" },
  "&thorn;": { "codepoints": [254], "characters": "\u00FE" },
  "&thorn": { "codepoints": [254], "characters": "\u00FE" },
  "&tilde;": { "codepoints": [732], "characters": "\u02DC" },
  "&Tilde;": { "codepoints": [8764], "characters": "\u223C" },
  "&TildeEqual;": { "codepoints": [8771], "characters": "\u2243" },
  "&TildeFullEqual;": { "codepoints": [8773], "characters": "\u2245" },
  "&TildeTilde;": { "codepoints": [8776], "characters": "\u2248" },
  "&timesbar;": { "codepoints": [10801], "characters": "\u2A31" },
  "&timesb;": { "codepoints": [8864], "characters": "\u22A0" },
  "&times;": { "codepoints": [215], "characters": "\u00D7" },
  "&times": { "codepoints": [215], "characters": "\u00D7" },
  "&timesd;": { "codepoints": [10800], "characters": "\u2A30" },
  "&tint;": { "codepoints": [8749], "characters": "\u222D" },
  "&toea;": { "codepoints": [10536], "characters": "\u2928" },
  "&topbot;": { "codepoints": [9014], "characters": "\u2336" },
  "&topcir;": { "codepoints": [10993], "characters": "\u2AF1" },
  "&top;": { "codepoints": [8868], "characters": "\u22A4" },
  "&Topf;": { "codepoints": [120139], "characters": "\uD835\uDD4B" },
  "&topf;": { "codepoints": [120165], "characters": "\uD835\uDD65" },
  "&topfork;": { "codepoints": [10970], "characters": "\u2ADA" },
  "&tosa;": { "codepoints": [10537], "characters": "\u2929" },
  "&tprime;": { "codepoints": [8244], "characters": "\u2034" },
  "&trade;": { "codepoints": [8482], "characters": "\u2122" },
  "&TRADE;": { "codepoints": [8482], "characters": "\u2122" },
  "&triangle;": { "codepoints": [9653], "characters": "\u25B5" },
  "&triangledown;": { "codepoints": [9663], "characters": "\u25BF" },
  "&triangleleft;": { "codepoints": [9667], "characters": "\u25C3" },
  "&trianglelefteq;": { "codepoints": [8884], "characters": "\u22B4" },
  "&triangleq;": { "codepoints": [8796], "characters": "\u225C" },
  "&triangleright;": { "codepoints": [9657], "characters": "\u25B9" },
  "&trianglerighteq;": { "codepoints": [8885], "characters": "\u22B5" },
  "&tridot;": { "codepoints": [9708], "characters": "\u25EC" },
  "&trie;": { "codepoints": [8796], "characters": "\u225C" },
  "&triminus;": { "codepoints": [10810], "characters": "\u2A3A" },
  "&TripleDot;": { "codepoints": [8411], "characters": "\u20DB" },
  "&triplus;": { "codepoints": [10809], "characters": "\u2A39" },
  "&trisb;": { "codepoints": [10701], "characters": "\u29CD" },
  "&tritime;": { "codepoints": [10811], "characters": "\u2A3B" },
  "&trpezium;": { "codepoints": [9186], "characters": "\u23E2" },
  "&Tscr;": { "codepoints": [119983], "characters": "\uD835\uDCAF" },
  "&tscr;": { "codepoints": [120009], "characters": "\uD835\uDCC9" },
  "&TScy;": { "codepoints": [1062], "characters": "\u0426" },
  "&tscy;": { "codepoints": [1094], "characters": "\u0446" },
  "&TSHcy;": { "codepoints": [1035], "characters": "\u040B" },
  "&tshcy;": { "codepoints": [1115], "characters": "\u045B" },
  "&Tstrok;": { "codepoints": [358], "characters": "\u0166" },
  "&tstrok;": { "codepoints": [359], "characters": "\u0167" },
  "&twixt;": { "codepoints": [8812], "characters": "\u226C" },
  "&twoheadleftarrow;": { "codepoints": [8606], "characters": "\u219E" },
  "&twoheadrightarrow;": { "codepoints": [8608], "characters": "\u21A0" },
  "&Uacute;": { "codepoints": [218], "characters": "\u00DA" },
  "&Uacute": { "codepoints": [218], "characters": "\u00DA" },
  "&uacute;": { "codepoints": [250], "characters": "\u00FA" },
  "&uacute": { "codepoints": [250], "characters": "\u00FA" },
  "&uarr;": { "codepoints": [8593], "characters": "\u2191" },
  "&Uarr;": { "codepoints": [8607], "characters": "\u219F" },
  "&uArr;": { "codepoints": [8657], "characters": "\u21D1" },
  "&Uarrocir;": { "codepoints": [10569], "characters": "\u2949" },
  "&Ubrcy;": { "codepoints": [1038], "characters": "\u040E" },
  "&ubrcy;": { "codepoints": [1118], "characters": "\u045E" },
  "&Ubreve;": { "codepoints": [364], "characters": "\u016C" },
  "&ubreve;": { "codepoints": [365], "characters": "\u016D" },
  "&Ucirc;": { "codepoints": [219], "characters": "\u00DB" },
  "&Ucirc": { "codepoints": [219], "characters": "\u00DB" },
  "&ucirc;": { "codepoints": [251], "characters": "\u00FB" },
  "&ucirc": { "codepoints": [251], "characters": "\u00FB" },
  "&Ucy;": { "codepoints": [1059], "characters": "\u0423" },
  "&ucy;": { "codepoints": [1091], "characters": "\u0443" },
  "&udarr;": { "codepoints": [8645], "characters": "\u21C5" },
  "&Udblac;": { "codepoints": [368], "characters": "\u0170" },
  "&udblac;": { "codepoints": [369], "characters": "\u0171" },
  "&udhar;": { "codepoints": [10606], "characters": "\u296E" },
  "&ufisht;": { "codepoints": [10622], "characters": "\u297E" },
  "&Ufr;": { "codepoints": [120088], "characters": "\uD835\uDD18" },
  "&ufr;": { "codepoints": [120114], "characters": "\uD835\uDD32" },
  "&Ugrave;": { "codepoints": [217], "characters": "\u00D9" },
  "&Ugrave": { "codepoints": [217], "characters": "\u00D9" },
  "&ugrave;": { "codepoints": [249], "characters": "\u00F9" },
  "&ugrave": { "codepoints": [249], "characters": "\u00F9" },
  "&uHar;": { "codepoints": [10595], "characters": "\u2963" },
  "&uharl;": { "codepoints": [8639], "characters": "\u21BF" },
  "&uharr;": { "codepoints": [8638], "characters": "\u21BE" },
  "&uhblk;": { "codepoints": [9600], "characters": "\u2580" },
  "&ulcorn;": { "codepoints": [8988], "characters": "\u231C" },
  "&ulcorner;": { "codepoints": [8988], "characters": "\u231C" },
  "&ulcrop;": { "codepoints": [8975], "characters": "\u230F" },
  "&ultri;": { "codepoints": [9720], "characters": "\u25F8" },
  "&Umacr;": { "codepoints": [362], "characters": "\u016A" },
  "&umacr;": { "codepoints": [363], "characters": "\u016B" },
  "&uml;": { "codepoints": [168], "characters": "\u00A8" },
  "&uml": { "codepoints": [168], "characters": "\u00A8" },
  "&UnderBar;": { "codepoints": [95], "characters": "\u005F" },
  "&UnderBrace;": { "codepoints": [9183], "characters": "\u23DF" },
  "&UnderBracket;": { "codepoints": [9141], "characters": "\u23B5" },
  "&UnderParenthesis;": { "codepoints": [9181], "characters": "\u23DD" },
  "&Union;": { "codepoints": [8899], "characters": "\u22C3" },
  "&UnionPlus;": { "codepoints": [8846], "characters": "\u228E" },
  "&Uogon;": { "codepoints": [370], "characters": "\u0172" },
  "&uogon;": { "codepoints": [371], "characters": "\u0173" },
  "&Uopf;": { "codepoints": [120140], "characters": "\uD835\uDD4C" },
  "&uopf;": { "codepoints": [120166], "characters": "\uD835\uDD66" },
  "&UpArrowBar;": { "codepoints": [10514], "characters": "\u2912" },
  "&uparrow;": { "codepoints": [8593], "characters": "\u2191" },
  "&UpArrow;": { "codepoints": [8593], "characters": "\u2191" },
  "&Uparrow;": { "codepoints": [8657], "characters": "\u21D1" },
  "&UpArrowDownArrow;": { "codepoints": [8645], "characters": "\u21C5" },
  "&updownarrow;": { "codepoints": [8597], "characters": "\u2195" },
  "&UpDownArrow;": { "codepoints": [8597], "characters": "\u2195" },
  "&Updownarrow;": { "codepoints": [8661], "characters": "\u21D5" },
  "&UpEquilibrium;": { "codepoints": [10606], "characters": "\u296E" },
  "&upharpoonleft;": { "codepoints": [8639], "characters": "\u21BF" },
  "&upharpoonright;": { "codepoints": [8638], "characters": "\u21BE" },
  "&uplus;": { "codepoints": [8846], "characters": "\u228E" },
  "&UpperLeftArrow;": { "codepoints": [8598], "characters": "\u2196" },
  "&UpperRightArrow;": { "codepoints": [8599], "characters": "\u2197" },
  "&upsi;": { "codepoints": [965], "characters": "\u03C5" },
  "&Upsi;": { "codepoints": [978], "characters": "\u03D2" },
  "&upsih;": { "codepoints": [978], "characters": "\u03D2" },
  "&Upsilon;": { "codepoints": [933], "characters": "\u03A5" },
  "&upsilon;": { "codepoints": [965], "characters": "\u03C5" },
  "&UpTeeArrow;": { "codepoints": [8613], "characters": "\u21A5" },
  "&UpTee;": { "codepoints": [8869], "characters": "\u22A5" },
  "&upuparrows;": { "codepoints": [8648], "characters": "\u21C8" },
  "&urcorn;": { "codepoints": [8989], "characters": "\u231D" },
  "&urcorner;": { "codepoints": [8989], "characters": "\u231D" },
  "&urcrop;": { "codepoints": [8974], "characters": "\u230E" },
  "&Uring;": { "codepoints": [366], "characters": "\u016E" },
  "&uring;": { "codepoints": [367], "characters": "\u016F" },
  "&urtri;": { "codepoints": [9721], "characters": "\u25F9" },
  "&Uscr;": { "codepoints": [119984], "characters": "\uD835\uDCB0" },
  "&uscr;": { "codepoints": [120010], "characters": "\uD835\uDCCA" },
  "&utdot;": { "codepoints": [8944], "characters": "\u22F0" },
  "&Utilde;": { "codepoints": [360], "characters": "\u0168" },
  "&utilde;": { "codepoints": [361], "characters": "\u0169" },
  "&utri;": { "codepoints": [9653], "characters": "\u25B5" },
  "&utrif;": { "codepoints": [9652], "characters": "\u25B4" },
  "&uuarr;": { "codepoints": [8648], "characters": "\u21C8" },
  "&Uuml;": { "codepoints": [220], "characters": "\u00DC" },
  "&Uuml": { "codepoints": [220], "characters": "\u00DC" },
  "&uuml;": { "codepoints": [252], "characters": "\u00FC" },
  "&uuml": { "codepoints": [252], "characters": "\u00FC" },
  "&uwangle;": { "codepoints": [10663], "characters": "\u29A7" },
  "&vangrt;": { "codepoints": [10652], "characters": "\u299C" },
  "&varepsilon;": { "codepoints": [1013], "characters": "\u03F5" },
  "&varkappa;": { "codepoints": [1008], "characters": "\u03F0" },
  "&varnothing;": { "codepoints": [8709], "characters": "\u2205" },
  "&varphi;": { "codepoints": [981], "characters": "\u03D5" },
  "&varpi;": { "codepoints": [982], "characters": "\u03D6" },
  "&varpropto;": { "codepoints": [8733], "characters": "\u221D" },
  "&varr;": { "codepoints": [8597], "characters": "\u2195" },
  "&vArr;": { "codepoints": [8661], "characters": "\u21D5" },
  "&varrho;": { "codepoints": [1009], "characters": "\u03F1" },
  "&varsigma;": { "codepoints": [962], "characters": "\u03C2" },
  "&varsubsetneq;": { "codepoints": [8842, 65024], "characters": "\u228A\uFE00" },
  "&varsubsetneqq;": { "codepoints": [10955, 65024], "characters": "\u2ACB\uFE00" },
  "&varsupsetneq;": { "codepoints": [8843, 65024], "characters": "\u228B\uFE00" },
  "&varsupsetneqq;": { "codepoints": [10956, 65024], "characters": "\u2ACC\uFE00" },
  "&vartheta;": { "codepoints": [977], "characters": "\u03D1" },
  "&vartriangleleft;": { "codepoints": [8882], "characters": "\u22B2" },
  "&vartriangleright;": { "codepoints": [8883], "characters": "\u22B3" },
  "&vBar;": { "codepoints": [10984], "characters": "\u2AE8" },
  "&Vbar;": { "codepoints": [10987], "characters": "\u2AEB" },
  "&vBarv;": { "codepoints": [10985], "characters": "\u2AE9" },
  "&Vcy;": { "codepoints": [1042], "characters": "\u0412" },
  "&vcy;": { "codepoints": [1074], "characters": "\u0432" },
  "&vdash;": { "codepoints": [8866], "characters": "\u22A2" },
  "&vDash;": { "codepoints": [8872], "characters": "\u22A8" },
  "&Vdash;": { "codepoints": [8873], "characters": "\u22A9" },
  "&VDash;": { "codepoints": [8875], "characters": "\u22AB" },
  "&Vdashl;": { "codepoints": [10982], "characters": "\u2AE6" },
  "&veebar;": { "codepoints": [8891], "characters": "\u22BB" },
  "&vee;": { "codepoints": [8744], "characters": "\u2228" },
  "&Vee;": { "codepoints": [8897], "characters": "\u22C1" },
  "&veeeq;": { "codepoints": [8794], "characters": "\u225A" },
  "&vellip;": { "codepoints": [8942], "characters": "\u22EE" },
  "&verbar;": { "codepoints": [124], "characters": "\u007C" },
  "&Verbar;": { "codepoints": [8214], "characters": "\u2016" },
  "&vert;": { "codepoints": [124], "characters": "\u007C" },
  "&Vert;": { "codepoints": [8214], "characters": "\u2016" },
  "&VerticalBar;": { "codepoints": [8739], "characters": "\u2223" },
  "&VerticalLine;": { "codepoints": [124], "characters": "\u007C" },
  "&VerticalSeparator;": { "codepoints": [10072], "characters": "\u2758" },
  "&VerticalTilde;": { "codepoints": [8768], "characters": "\u2240" },
  "&VeryThinSpace;": { "codepoints": [8202], "characters": "\u200A" },
  "&Vfr;": { "codepoints": [120089], "characters": "\uD835\uDD19" },
  "&vfr;": { "codepoints": [120115], "characters": "\uD835\uDD33" },
  "&vltri;": { "codepoints": [8882], "characters": "\u22B2" },
  "&vnsub;": { "codepoints": [8834, 8402], "characters": "\u2282\u20D2" },
  "&vnsup;": { "codepoints": [8835, 8402], "characters": "\u2283\u20D2" },
  "&Vopf;": { "codepoints": [120141], "characters": "\uD835\uDD4D" },
  "&vopf;": { "codepoints": [120167], "characters": "\uD835\uDD67" },
  "&vprop;": { "codepoints": [8733], "characters": "\u221D" },
  "&vrtri;": { "codepoints": [8883], "characters": "\u22B3" },
  "&Vscr;": { "codepoints": [119985], "characters": "\uD835\uDCB1" },
  "&vscr;": { "codepoints": [120011], "characters": "\uD835\uDCCB" },
  "&vsubnE;": { "codepoints": [10955, 65024], "characters": "\u2ACB\uFE00" },
  "&vsubne;": { "codepoints": [8842, 65024], "characters": "\u228A\uFE00" },
  "&vsupnE;": { "codepoints": [10956, 65024], "characters": "\u2ACC\uFE00" },
  "&vsupne;": { "codepoints": [8843, 65024], "characters": "\u228B\uFE00" },
  "&Vvdash;": { "codepoints": [8874], "characters": "\u22AA" },
  "&vzigzag;": { "codepoints": [10650], "characters": "\u299A" },
  "&Wcirc;": { "codepoints": [372], "characters": "\u0174" },
  "&wcirc;": { "codepoints": [373], "characters": "\u0175" },
  "&wedbar;": { "codepoints": [10847], "characters": "\u2A5F" },
  "&wedge;": { "codepoints": [8743], "characters": "\u2227" },
  "&Wedge;": { "codepoints": [8896], "characters": "\u22C0" },
  "&wedgeq;": { "codepoints": [8793], "characters": "\u2259" },
  "&weierp;": { "codepoints": [8472], "characters": "\u2118" },
  "&Wfr;": { "codepoints": [120090], "characters": "\uD835\uDD1A" },
  "&wfr;": { "codepoints": [120116], "characters": "\uD835\uDD34" },
  "&Wopf;": { "codepoints": [120142], "characters": "\uD835\uDD4E" },
  "&wopf;": { "codepoints": [120168], "characters": "\uD835\uDD68" },
  "&wp;": { "codepoints": [8472], "characters": "\u2118" },
  "&wr;": { "codepoints": [8768], "characters": "\u2240" },
  "&wreath;": { "codepoints": [8768], "characters": "\u2240" },
  "&Wscr;": { "codepoints": [119986], "characters": "\uD835\uDCB2" },
  "&wscr;": { "codepoints": [120012], "characters": "\uD835\uDCCC" },
  "&xcap;": { "codepoints": [8898], "characters": "\u22C2" },
  "&xcirc;": { "codepoints": [9711], "characters": "\u25EF" },
  "&xcup;": { "codepoints": [8899], "characters": "\u22C3" },
  "&xdtri;": { "codepoints": [9661], "characters": "\u25BD" },
  "&Xfr;": { "codepoints": [120091], "characters": "\uD835\uDD1B" },
  "&xfr;": { "codepoints": [120117], "characters": "\uD835\uDD35" },
  "&xharr;": { "codepoints": [10231], "characters": "\u27F7" },
  "&xhArr;": { "codepoints": [10234], "characters": "\u27FA" },
  "&Xi;": { "codepoints": [926], "characters": "\u039E" },
  "&xi;": { "codepoints": [958], "characters": "\u03BE" },
  "&xlarr;": { "codepoints": [10229], "characters": "\u27F5" },
  "&xlArr;": { "codepoints": [10232], "characters": "\u27F8" },
  "&xmap;": { "codepoints": [10236], "characters": "\u27FC" },
  "&xnis;": { "codepoints": [8955], "characters": "\u22FB" },
  "&xodot;": { "codepoints": [10752], "characters": "\u2A00" },
  "&Xopf;": { "codepoints": [120143], "characters": "\uD835\uDD4F" },
  "&xopf;": { "codepoints": [120169], "characters": "\uD835\uDD69" },
  "&xoplus;": { "codepoints": [10753], "characters": "\u2A01" },
  "&xotime;": { "codepoints": [10754], "characters": "\u2A02" },
  "&xrarr;": { "codepoints": [10230], "characters": "\u27F6" },
  "&xrArr;": { "codepoints": [10233], "characters": "\u27F9" },
  "&Xscr;": { "codepoints": [119987], "characters": "\uD835\uDCB3" },
  "&xscr;": { "codepoints": [120013], "characters": "\uD835\uDCCD" },
  "&xsqcup;": { "codepoints": [10758], "characters": "\u2A06" },
  "&xuplus;": { "codepoints": [10756], "characters": "\u2A04" },
  "&xutri;": { "codepoints": [9651], "characters": "\u25B3" },
  "&xvee;": { "codepoints": [8897], "characters": "\u22C1" },
  "&xwedge;": { "codepoints": [8896], "characters": "\u22C0" },
  "&Yacute;": { "codepoints": [221], "characters": "\u00DD" },
  "&Yacute": { "codepoints": [221], "characters": "\u00DD" },
  "&yacute;": { "codepoints": [253], "characters": "\u00FD" },
  "&yacute": { "codepoints": [253], "characters": "\u00FD" },
  "&YAcy;": { "codepoints": [1071], "characters": "\u042F" },
  "&yacy;": { "codepoints": [1103], "characters": "\u044F" },
  "&Ycirc;": { "codepoints": [374], "characters": "\u0176" },
  "&ycirc;": { "codepoints": [375], "characters": "\u0177" },
  "&Ycy;": { "codepoints": [1067], "characters": "\u042B" },
  "&ycy;": { "codepoints": [1099], "characters": "\u044B" },
  "&yen;": { "codepoints": [165], "characters": "\u00A5" },
  "&yen": { "codepoints": [165], "characters": "\u00A5" },
  "&Yfr;": { "codepoints": [120092], "characters": "\uD835\uDD1C" },
  "&yfr;": { "codepoints": [120118], "characters": "\uD835\uDD36" },
  "&YIcy;": { "codepoints": [1031], "characters": "\u0407" },
  "&yicy;": { "codepoints": [1111], "characters": "\u0457" },
  "&Yopf;": { "codepoints": [120144], "characters": "\uD835\uDD50" },
  "&yopf;": { "codepoints": [120170], "characters": "\uD835\uDD6A" },
  "&Yscr;": { "codepoints": [119988], "characters": "\uD835\uDCB4" },
  "&yscr;": { "codepoints": [120014], "characters": "\uD835\uDCCE" },
  "&YUcy;": { "codepoints": [1070], "characters": "\u042E" },
  "&yucy;": { "codepoints": [1102], "characters": "\u044E" },
  "&yuml;": { "codepoints": [255], "characters": "\u00FF" },
  "&yuml": { "codepoints": [255], "characters": "\u00FF" },
  "&Yuml;": { "codepoints": [376], "characters": "\u0178" },
  "&Zacute;": { "codepoints": [377], "characters": "\u0179" },
  "&zacute;": { "codepoints": [378], "characters": "\u017A" },
  "&Zcaron;": { "codepoints": [381], "characters": "\u017D" },
  "&zcaron;": { "codepoints": [382], "characters": "\u017E" },
  "&Zcy;": { "codepoints": [1047], "characters": "\u0417" },
  "&zcy;": { "codepoints": [1079], "characters": "\u0437" },
  "&Zdot;": { "codepoints": [379], "characters": "\u017B" },
  "&zdot;": { "codepoints": [380], "characters": "\u017C" },
  "&zeetrf;": { "codepoints": [8488], "characters": "\u2128" },
  "&ZeroWidthSpace;": { "codepoints": [8203], "characters": "\u200B" },
  "&Zeta;": { "codepoints": [918], "characters": "\u0396" },
  "&zeta;": { "codepoints": [950], "characters": "\u03B6" },
  "&zfr;": { "codepoints": [120119], "characters": "\uD835\uDD37" },
  "&Zfr;": { "codepoints": [8488], "characters": "\u2128" },
  "&ZHcy;": { "codepoints": [1046], "characters": "\u0416" },
  "&zhcy;": { "codepoints": [1078], "characters": "\u0436" },
  "&zigrarr;": { "codepoints": [8669], "characters": "\u21DD" },
  "&zopf;": { "codepoints": [120171], "characters": "\uD835\uDD6B" },
  "&Zopf;": { "codepoints": [8484], "characters": "\u2124" },
  "&Zscr;": { "codepoints": [119989], "characters": "\uD835\uDCB5" },
  "&zscr;": { "codepoints": [120015], "characters": "\uD835\uDCCF" },
  "&zwj;": { "codepoints": [8205], "characters": "\u200D" },
  "&zwnj;": { "codepoints": [8204], "characters": "\u200C" }
};

var ALPHANUMERIC = /^[a-zA-Z0-9]/;
var getPossibleNamedEntityStart = makeRegexMatcher(/^&[a-zA-Z0-9]/);
var getApparentNamedEntity = makeRegexMatcher(/^&[a-zA-Z0-9]+;/);

var getNamedEntityByFirstChar = {};
(function () {
  var namedEntitiesByFirstChar = {};
  for (var ent in ENTITIES) {
    var chr = ent.charAt(1);
    namedEntitiesByFirstChar[chr] = (namedEntitiesByFirstChar[chr] || []);
    namedEntitiesByFirstChar[chr].push(ent.slice(2));
  }
  for (var chr in namedEntitiesByFirstChar) {
    getNamedEntityByFirstChar[chr] = makeRegexMatcher(
      new RegExp('^&' + chr + '(?:' +
                 namedEntitiesByFirstChar[chr].join('|') + ')'));
  }
})();

// Run a provided "matcher" function but reset the current position afterwards.
// Fatal failure of the matcher is not suppressed.
var peekMatcher = function (scanner, matcher) {
  var start = scanner.pos;
  var result = matcher(scanner);
  scanner.pos = start;
  return result;
};

// Returns a string like "&amp;" or a falsy value if no match.  Fails fatally
// if something looks like a named entity but isn't.
var getNamedCharRef = function (scanner, inAttribute) {
  // look for `&` followed by alphanumeric
  if (! peekMatcher(scanner, getPossibleNamedEntityStart))
    return null;

  var matcher = getNamedEntityByFirstChar[scanner.rest().charAt(1)];
  var entity = null;
  if (matcher)
    entity = peekMatcher(scanner, matcher);

  if (entity) {
    if (entity.slice(-1) !== ';') {
      // Certain character references with no semi are an error, like `&lt`.
      // In attribute values, however, this is not fatal if the next character
      // is alphanumeric.
      //
      // This rule affects href attributes, for example, deeming "/?foo=bar&ltc=abc"
      // to be ok but "/?foo=bar&lt=abc" to not be.
      if (inAttribute && ALPHANUMERIC.test(scanner.rest().charAt(entity.length)))
        return null;
      scanner.fatal("Character reference requires semicolon: " + entity);
    } else {
      scanner.pos += entity.length;
      return entity;
    }
  } else {
    // we couldn't match any real entity, so see if this is a bad entity
    // or something we can overlook.
    var badEntity = peekMatcher(scanner, getApparentNamedEntity);
    if (badEntity)
      scanner.fatal("Invalid character reference: " + badEntity);
    // `&aaaa` is ok with no semicolon
    return null;
  }
};

// Returns the sequence of one or two codepoints making up an entity as an array.
// Codepoints in the array are integers and may be out of the single-char JavaScript
// range.
var getCodePoints = function (namedEntity) {
  return ENTITIES[namedEntity].codepoints;
};

var ALLOWED_AFTER_AMP = /^[\u0009\u000a\u000c <&]/;

var getCharRefNumber = makeRegexMatcher(/^(?:[xX][0-9a-fA-F]+|[0-9]+);/);

var BIG_BAD_CODEPOINTS = (function (obj) {
  var list = [0x1FFFE, 0x1FFFF, 0x2FFFE, 0x2FFFF, 0x3FFFE, 0x3FFFF,
              0x4FFFE, 0x4FFFF, 0x5FFFE, 0x5FFFF, 0x6FFFE, 0x6FFFF,
              0x7FFFE, 0x7FFFF, 0x8FFFE, 0x8FFFF, 0x9FFFE, 0x9FFFF,
              0xAFFFE, 0xAFFFF, 0xBFFFE, 0xBFFFF, 0xCFFFE, 0xCFFFF,
              0xDFFFE, 0xDFFFF, 0xEFFFE, 0xEFFFF, 0xFFFFE, 0xFFFFF,
              0x10FFFE, 0x10FFFF];
  for (var i = 0; i < list.length; i++)
    obj[list[i]] = true;

  return obj;
})({});

var isLegalCodepoint = function (cp) {
  if ((cp === 0) ||
      (cp >= 0x80 && cp <= 0x9f) ||
      (cp >= 0xd800 && cp <= 0xdfff) ||
      (cp >= 0x10ffff) ||
      (cp >= 0x1 && cp <= 0x8) ||
      (cp === 0xb) ||
      (cp >= 0xd && cp <= 0x1f) ||
      (cp >= 0x7f && cp <= 0x9f) ||
      (cp >= 0xfdd0 && cp <= 0xfdef) ||
      (cp === 0xfffe) ||
      (cp === 0xffff) ||
      (cp >= 0x10000 && BIG_BAD_CODEPOINTS[cp]))
    return false;

  return true;
};

// http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html#consume-a-character-reference
//
// Matches a character reference if possible, including the initial `&`.
// Fails fatally in error cases (assuming an initial `&` is matched), like a disallowed codepoint
// number or a bad named character reference.
//
// `inAttribute` is truthy if we are in an attribute value.
//
// `allowedChar` is an optional character that,
// if found after the initial `&`, aborts parsing silently rather than failing fatally.  In real use it is
// either `"`, `'`, or `>` and is supplied when parsing attribute values.  NOTE: In the current spec, the
// value of `allowedChar` doesn't actually seem to end up mattering, but there is still some debate about
// the right approach to ampersands.
getCharacterReference = HTMLTools.Parse.getCharacterReference = function (scanner, inAttribute, allowedChar) {
  if (scanner.peek() !== '&')
    // no ampersand
    return null;

  var afterAmp = scanner.rest().charAt(1);

  if (afterAmp === '#') {
    scanner.pos += 2;
    // refNumber includes possible initial `x` and final semicolon
    var refNumber = getCharRefNumber(scanner);
    // At this point we've consumed the input, so we're committed to returning
    // something or failing fatally.
    if (! refNumber)
      scanner.fatal("Invalid numerical character reference starting with &#");
    var codepoint;
    if (refNumber.charAt(0) === 'x' || refNumber.charAt(0) === 'X') {
      // hex
      var hex = refNumber.slice(1, -1);
      while (hex.charAt(0) === '0')
        hex = hex.slice(1);
      if (hex.length > 6)
        scanner.fatal("Numerical character reference too large: 0x" + hex);
      codepoint = parseInt(hex || "0", 16);
    } else {
      var dec = refNumber.slice(0, -1);
      while (dec.charAt(0) === '0')
        dec = dec.slice(1);
      if (dec.length > 7)
        scanner.fatal("Numerical character reference too large: " + dec);
      codepoint = parseInt(dec || "0", 10);
    }
    if (! isLegalCodepoint(codepoint))
      scanner.fatal("Illegal codepoint in numerical character reference: &#" + refNumber);
    return { t: 'CharRef',
             v: '&#' + refNumber,
             cp: [codepoint] };
  } else if ((! afterAmp) // EOF
             || (allowedChar && afterAmp === allowedChar)
             || ALLOWED_AFTER_AMP.test(afterAmp)) {
    return null;
  } else {
    var namedEntity = getNamedCharRef(scanner, inAttribute);
    if (namedEntity) {
      return { t: 'CharRef',
               v: namedEntity,
               cp: getCodePoints(namedEntity) };
    } else {
      return null;
    }
  }
};
// Token types:
//
// { t: 'Doctype',
//   v: String (entire Doctype declaration from the source),
//   name: String,
//   systemId: String (optional),
//   publicId: String (optional)
// }
//
// { t: 'Comment',
//   v: String (not including "<!--" and "-->")
// }
//
// { t: 'Chars',
//   v: String (pure text like you might pass to document.createTextNode,
//              no character references)
// }
//
// { t: 'Tag',
//   isEnd: Boolean (optional),
//   isSelfClosing: Boolean (optional),
//   n: String (tag name, in lowercase or camel case),
//   attrs: dictionary of { String: [tokens] }
//          OR [{ String: [tokens] }, TemplateTag tokens...]
//     (only for start tags; required)
// }
//
// { t: 'CharRef',
//   v: String (entire character reference from the source, e.g. "&amp;"),
//   cp: [Integer] (array of Unicode code point numbers it expands to)
// }
//
// We keep around both the original form of the character reference and its
// expansion so that subsequent processing steps have the option to
// re-emit it (if they are generating HTML) or interpret it.  Named and
// numerical code points may be more than 16 bits, in which case they
// need to passed through codePointToString to make a JavaScript string.
// Most named entities and all numeric character references are one codepoint
// (e.g. "&amp;" is [38]), but a few are two codepoints.
//
// { t: 'TemplateTag',
//   v: HTMLTools.TemplateTag
// }

// The HTML tokenization spec says to preprocess the input stream to replace
// CR(LF)? with LF.  However, preprocessing `scanner` would complicate things
// by making indexes not match the input (e.g. for error messages), so we just
// keep in mind as we go along that an LF might be represented by CRLF or CR.
// In most cases, it doesn't actually matter what combination of whitespace
// characters are present (e.g. inside tags).
var HTML_SPACE = /^[\f\n\r\t ]/;

var convertCRLF = function (str) {
  return str.replace(/\r\n?/g, '\n');
};

getComment = HTMLTools.Parse.getComment = function (scanner) {
  if (scanner.rest().slice(0, 4) !== '<!--')
    return null;
  scanner.pos += 4;

  // Valid comments are easy to parse; they end at the first `--`!
  // Our main job is throwing errors.

  var rest = scanner.rest();
  if (rest.charAt(0) === '>' || rest.slice(0, 2) === '->')
    scanner.fatal("HTML comment can't start with > or ->");

  var closePos = rest.indexOf('-->');
  if (closePos < 0)
    scanner.fatal("Unclosed HTML comment");

  var commentContents = rest.slice(0, closePos);
  if (commentContents.slice(-1) === '-')
    scanner.fatal("HTML comment must end at first `--`");
  if (commentContents.indexOf("--") >= 0)
    scanner.fatal("HTML comment cannot contain `--` anywhere");
  if (commentContents.indexOf('\u0000') >= 0)
    scanner.fatal("HTML comment cannot contain NULL");

  scanner.pos += closePos + 3;

  return { t: 'Comment',
           v: convertCRLF(commentContents) };
};

var skipSpaces = function (scanner) {
  while (HTML_SPACE.test(scanner.peek()))
    scanner.pos++;
};

var requireSpaces = function (scanner) {
  if (! HTML_SPACE.test(scanner.peek()))
    scanner.fatal("Expected space");
  skipSpaces(scanner);
};

var getDoctypeQuotedString = function (scanner) {
  var quote = scanner.peek();
  if (! (quote === '"' || quote === "'"))
    scanner.fatal("Expected single or double quote in DOCTYPE");
  scanner.pos++;

  if (scanner.peek() === quote)
    // prevent a falsy return value (empty string)
    scanner.fatal("Malformed DOCTYPE");

  var str = '';
  var ch;
  while ((ch = scanner.peek()), ch !== quote) {
    if ((! ch) || (ch === '\u0000') || (ch === '>'))
      scanner.fatal("Malformed DOCTYPE");
    str += ch;
    scanner.pos++;
  }

  scanner.pos++;

  return str;
};

// See http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#the-doctype.
//
// If `getDocType` sees "<!DOCTYPE" (case-insensitive), it will match or fail fatally.
getDoctype = HTMLTools.Parse.getDoctype = function (scanner) {
  if (HTMLTools.asciiLowerCase(scanner.rest().slice(0, 9)) !== '<!doctype')
    return null;
  var start = scanner.pos;
  scanner.pos += 9;

  requireSpaces(scanner);

  var ch = scanner.peek();
  if ((! ch) || (ch === '>') || (ch === '\u0000'))
    scanner.fatal('Malformed DOCTYPE');
  var name = ch;
  scanner.pos++;

  while ((ch = scanner.peek()), ! (HTML_SPACE.test(ch) || ch === '>')) {
    if ((! ch) || (ch === '\u0000'))
      scanner.fatal('Malformed DOCTYPE');
    name += ch;
    scanner.pos++;
  }
  name = HTMLTools.asciiLowerCase(name);

  // Now we're looking at a space or a `>`.
  skipSpaces(scanner);

  var systemId = null;
  var publicId = null;

  if (scanner.peek() !== '>') {
    // Now we're essentially in the "After DOCTYPE name state" of the tokenizer,
    // but we're not looking at space or `>`.

    // this should be "public" or "system".
    var publicOrSystem = HTMLTools.asciiLowerCase(scanner.rest().slice(0, 6));

    if (publicOrSystem === 'system') {
      scanner.pos += 6;
      requireSpaces(scanner);
      systemId = getDoctypeQuotedString(scanner);
      skipSpaces(scanner);
      if (scanner.peek() !== '>')
        scanner.fatal("Malformed DOCTYPE");
    } else if (publicOrSystem === 'public') {
      scanner.pos += 6;
      requireSpaces(scanner);
      publicId = getDoctypeQuotedString(scanner);
      if (scanner.peek() !== '>') {
        requireSpaces(scanner);
        if (scanner.peek() !== '>') {
          systemId = getDoctypeQuotedString(scanner);
          skipSpaces(scanner);
          if (scanner.peek() !== '>')
            scanner.fatal("Malformed DOCTYPE");
        }
      }
    } else {
      scanner.fatal("Expected PUBLIC or SYSTEM in DOCTYPE");
    }
  }

  // looking at `>`
  scanner.pos++;
  var result = { t: 'Doctype',
                 v: scanner.input.slice(start, scanner.pos),
                 name: name };

  if (systemId)
    result.systemId = systemId;
  if (publicId)
    result.publicId = publicId;

  return result;
};

// The special character `{` is only allowed as the first character
// of a Chars, so that we have a chance to detect template tags.
var getChars = makeRegexMatcher(/^[^&<\u0000][^&<\u0000{]*/);

var assertIsTemplateTag = function (x) {
  if (! (x instanceof HTMLTools.TemplateTag))
    throw new Error("Expected an instance of HTMLTools.TemplateTag");
  return x;
};

// Returns the next HTML token, or `null` if we reach EOF.
//
// Note that if we have a `getTemplateTag` function that sometimes
// consumes characters and emits nothing (e.g. in the case of template
// comments), we may go from not-at-EOF to at-EOF and return `null`,
// while otherwise we always find some token to return.
getHTMLToken = HTMLTools.Parse.getHTMLToken = function (scanner, dataMode) {
  var result = null;
  if (scanner.getTemplateTag) {
    // Try to parse a template tag by calling out to the provided
    // `getTemplateTag` function.  If the function returns `null` but
    // consumes characters, it must have parsed a comment or something,
    // so we loop and try it again.  If it ever returns `null` without
    // consuming anything, that means it didn't see anything interesting
    // so we look for a normal token.  If it returns a truthy value,
    // the value must be instanceof HTMLTools.TemplateTag.  We wrap it
    // in a Special token.
    var lastPos = scanner.pos;
    result = scanner.getTemplateTag(
      scanner,
      (dataMode === 'rcdata' ? TEMPLATE_TAG_POSITION.IN_RCDATA :
       (dataMode === 'rawtext' ? TEMPLATE_TAG_POSITION.IN_RAWTEXT :
        TEMPLATE_TAG_POSITION.ELEMENT)));

    if (result)
      return { t: 'TemplateTag', v: assertIsTemplateTag(result) };
    else if (scanner.pos > lastPos)
      return null;
  }

  var chars = getChars(scanner);
  if (chars)
    return { t: 'Chars',
             v: convertCRLF(chars) };

  var ch = scanner.peek();
  if (! ch)
    return null; // EOF

  if (ch === '\u0000')
    scanner.fatal("Illegal NULL character");

  if (ch === '&') {
    if (dataMode !== 'rawtext') {
      var charRef = getCharacterReference(scanner);
      if (charRef)
        return charRef;
    }

    scanner.pos++;
    return { t: 'Chars',
             v: '&' };
  }

  // If we're here, we're looking at `<`.

  if (scanner.peek() === '<' && dataMode) {
    // don't interpret tags
    scanner.pos++;
    return { t: 'Chars',
             v: '<' };
  }

  // `getTag` will claim anything starting with `<` not followed by `!`.
  // `getComment` takes `<!--` and getDoctype takes `<!doctype`.
  result = (getTagToken(scanner) || getComment(scanner) || getDoctype(scanner));

  if (result)
    return result;

  scanner.fatal("Unexpected `<!` directive.");
};

var getTagName = makeRegexMatcher(/^[a-zA-Z][^\f\n\r\t />{]*/);
var getClangle = makeRegexMatcher(/^>/);
var getSlash = makeRegexMatcher(/^\//);
var getAttributeName = makeRegexMatcher(/^[^>/\u0000"'<=\f\n\r\t ][^\f\n\r\t /=>"'<\u0000]*/);

// Try to parse `>` or `/>`, mutating `tag` to be self-closing in the latter
// case (and failing fatally if `/` isn't followed by `>`).
// Return tag if successful.
var handleEndOfTag = function (scanner, tag) {
  if (getClangle(scanner))
    return tag;

  if (getSlash(scanner)) {
    if (! getClangle(scanner))
      scanner.fatal("Expected `>` after `/`");
    tag.isSelfClosing = true;
    return tag;
  }

  return null;
};

// Scan a quoted or unquoted attribute value (omit `quote` for unquoted).
var getAttributeValue = function (scanner, quote) {
  if (quote) {
    if (scanner.peek() !== quote)
      return null;
    scanner.pos++;
  }

  var tokens = [];
  var charsTokenToExtend = null;

  var charRef;
  while (true) {
    var ch = scanner.peek();
    var templateTag;
    var curPos = scanner.pos;
    if (quote && ch === quote) {
      scanner.pos++;
      return tokens;
    } else if ((! quote) && (HTML_SPACE.test(ch) || ch === '>')) {
      return tokens;
    } else if (! ch) {
      scanner.fatal("Unclosed attribute in tag");
    } else if (quote ? ch === '\u0000' : ('\u0000"\'<=`'.indexOf(ch) >= 0)) {
      scanner.fatal("Unexpected character in attribute value");
    } else if (ch === '&' &&
               (charRef = getCharacterReference(scanner, true,
                                                quote || '>'))) {
      tokens.push(charRef);
      charsTokenToExtend = null;
    } else if (scanner.getTemplateTag &&
               ((templateTag = scanner.getTemplateTag(
                 scanner, TEMPLATE_TAG_POSITION.IN_ATTRIBUTE)) ||
                scanner.pos > curPos /* `{{! comment}}` */)) {
      if (templateTag) {
        tokens.push({t: 'TemplateTag',
                     v: assertIsTemplateTag(templateTag)});
        charsTokenToExtend = null;
      }
    } else {
      if (! charsTokenToExtend) {
        charsTokenToExtend = { t: 'Chars', v: '' };
        tokens.push(charsTokenToExtend);
      }
      charsTokenToExtend.v += (ch === '\r' ? '\n' : ch);
      scanner.pos++;
      if (quote && ch === '\r' && scanner.peek() === '\n')
        scanner.pos++;
    }
  }
};

var hasOwnProperty = Object.prototype.hasOwnProperty;

getTagToken = HTMLTools.Parse.getTagToken = function (scanner) {
  if (! (scanner.peek() === '<' && scanner.rest().charAt(1) !== '!'))
    return null;
  scanner.pos++;

  var tag = { t: 'Tag' };

  // now looking at the character after `<`, which is not a `!`
  if (scanner.peek() === '/') {
    tag.isEnd = true;
    scanner.pos++;
  }

  var tagName = getTagName(scanner);
  if (! tagName)
    scanner.fatal("Expected tag name after `<`");
  tag.n = HTMLTools.properCaseTagName(tagName);

  if (scanner.peek() === '/' && tag.isEnd)
    scanner.fatal("End tag can't have trailing slash");
  if (handleEndOfTag(scanner, tag))
    return tag;

  if (scanner.isEOF())
    scanner.fatal("Unclosed `<`");

  if (! HTML_SPACE.test(scanner.peek()))
    // e.g. `<a{{b}}>`
    scanner.fatal("Expected space after tag name");

  // we're now in "Before attribute name state" of the tokenizer
  skipSpaces(scanner);

  if (scanner.peek() === '/' && tag.isEnd)
    scanner.fatal("End tag can't have trailing slash");
  if (handleEndOfTag(scanner, tag))
    return tag;

  if (tag.isEnd)
    scanner.fatal("End tag can't have attributes");

  tag.attrs = {};
  var nondynamicAttrs = tag.attrs;

  while (true) {
    // Note: at the top of this loop, we've already skipped any spaces.

    // This will be set to true if after parsing the attribute, we should
    // require spaces (or else an end of tag, i.e. `>` or `/>`).
    var spacesRequiredAfter = false;

    // first, try for a template tag.
    var curPos = scanner.pos;
    var templateTag = (scanner.getTemplateTag &&
                       scanner.getTemplateTag(
                         scanner, TEMPLATE_TAG_POSITION.IN_START_TAG));
    if (templateTag || (scanner.pos > curPos)) {
      if (templateTag) {
        if (tag.attrs === nondynamicAttrs)
          tag.attrs = [nondynamicAttrs];
        tag.attrs.push({ t: 'TemplateTag',
                         v: assertIsTemplateTag(templateTag) });
      } // else, must have scanned a `{{! comment}}`

      spacesRequiredAfter = true;
    } else {

      var attributeName = getAttributeName(scanner);
      if (! attributeName)
        scanner.fatal("Expected attribute name in tag");
      // Throw error on `{` in attribute name.  This provides *some* error message
      // if someone writes `<a x{{y}}>` or `<a x{{y}}=z>`.  The HTML tokenization
      // spec doesn't say that `{` is invalid, but the DOM API (setAttribute) won't
      // allow it, so who cares.
      if (attributeName.indexOf('{') >= 0)
        scanner.fatal("Unexpected `{` in attribute name.");
      attributeName = HTMLTools.properCaseAttributeName(attributeName);

      if (hasOwnProperty.call(nondynamicAttrs, attributeName))
        scanner.fatal("Duplicate attribute in tag: " + attributeName);

      nondynamicAttrs[attributeName] = [];

      skipSpaces(scanner);

      if (handleEndOfTag(scanner, tag))
        return tag;

      var ch = scanner.peek();
      if (! ch)
        scanner.fatal("Unclosed <");
      if ('\u0000"\'<'.indexOf(ch) >= 0)
        scanner.fatal("Unexpected character after attribute name in tag");

      if (ch === '=') {
        scanner.pos++;

        skipSpaces(scanner);

        ch = scanner.peek();
        if (! ch)
          scanner.fatal("Unclosed <");
        if ('\u0000><=`'.indexOf(ch) >= 0)
          scanner.fatal("Unexpected character after = in tag");

        if ((ch === '"') || (ch === "'"))
          nondynamicAttrs[attributeName] = getAttributeValue(scanner, ch);
        else
          nondynamicAttrs[attributeName] = getAttributeValue(scanner);

        spacesRequiredAfter = true;
      }
    }
    // now we are in the "post-attribute" position, whether it was a template tag
    // attribute (like `{{x}}`) or a normal one (like `x` or `x=y`).

    if (handleEndOfTag(scanner, tag))
      return tag;

    if (scanner.isEOF())
      scanner.fatal("Unclosed `<`");

    if (spacesRequiredAfter)
      requireSpaces(scanner);
    else
      skipSpaces(scanner);

    if (handleEndOfTag(scanner, tag))
      return tag;
  }
};

TEMPLATE_TAG_POSITION = HTMLTools.TEMPLATE_TAG_POSITION = {
  ELEMENT: 1,
  IN_START_TAG: 2,
  IN_ATTRIBUTE: 3,
  IN_RCDATA: 4,
  IN_RAWTEXT: 5
};

// tagName must be proper case
isLookingAtEndTag = function (scanner, tagName) {
  var rest = scanner.rest();
  var pos = 0; // into rest
  var firstPart = /^<\/([a-zA-Z]+)/.exec(rest);
  if (firstPart &&
      HTMLTools.properCaseTagName(firstPart[1]) === tagName) {
    // we've seen `</foo`, now see if the end tag continues
    pos += firstPart[0].length;
    while (pos < rest.length && HTML_SPACE.test(rest.charAt(pos)))
      pos++;
    if (pos < rest.length && rest.charAt(pos) === '>')
      return true;
  }
  return false;
};
// _assign is like _.extend or the upcoming Object.assign.
// Copy src's own, enumerable properties onto tgt and return
// tgt.
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var _assign = function (tgt, src) {
  for (var k in src) {
    if (_hasOwnProperty.call(src, k))
      tgt[k] = src[k];
  }
  return tgt;
};


HTMLTools.TemplateTag = function (props) {
  if (! (this instanceof HTMLTools.TemplateTag))
    // called without `new`
    return new HTMLTools.TemplateTag;

  if (props)
    _assign(this, props);
};

_assign(HTMLTools.TemplateTag.prototype, {
  constructorName: 'HTMLTools.TemplateTag',
  toJS: function (visitor) {
    return visitor.generateCall(this.constructorName,
                                _assign({}, this));
  }
});

// Parse a "fragment" of HTML, up to the end of the input or a particular
// template tag (using the "shouldStop" option).
HTMLTools.parseFragment = function (input, options) {
  var scanner;
  if (typeof input === 'string')
    scanner = new Scanner(input);
  else
    // input can be a scanner.  We'd better not have a different
    // value for the "getTemplateTag" option as when the scanner
    // was created, because we don't do anything special to reset
    // the value (which is attached to the scanner).
    scanner = input;

  // ```
  // { getTemplateTag: function (scanner, templateTagPosition) {
  //     if (templateTagPosition === HTMLTools.TEMPLATE_TAG_POSITION.ELEMENT) {
  //       ...
  // ```
  if (options && options.getTemplateTag)
    scanner.getTemplateTag = options.getTemplateTag;

  // function (scanner) -> boolean
  var shouldStop = options && options.shouldStop;

  var result;
  if (options && options.textMode) {
    if (options.textMode === HTML.TEXTMODE.STRING) {
      result = getRawText(scanner, null, shouldStop);
    } else if (options.textMode === HTML.TEXTMODE.RCDATA) {
      result = getRCData(scanner, null, shouldStop);
    } else {
      throw new Error("Unsupported textMode: " + options.textMode);
    }
  } else {
    result = getContent(scanner, shouldStop);
  }
  if (! scanner.isEOF()) {
    // If we aren't at the end of the input, we either stopped at an unmatched
    // HTML end tag or at a template tag (like `{{else}}` or `{{/if}}`).
    // Detect the former case (stopped at an HTML end tag) and throw a good
    // error.

    var posBefore = scanner.pos;

    try {
      var endTag = getHTMLToken(scanner);
    } catch (e) {
      // ignore errors from getTemplateTag
    }

    // XXX we make some assumptions about shouldStop here, like that it
    // won't tell us to stop at an HTML end tag.  Should refactor
    // `shouldStop` into something more suitable.
    if (endTag && endTag.t === 'Tag' && endTag.isEnd) {
      var closeTag = endTag.n;
      var isVoidElement = HTML.isVoidElement(closeTag);
      scanner.fatal("Unexpected HTML close tag" +
                    (isVoidElement ?
                     '.  <' + endTag.n + '> should have no close tag.' : ''));
    }

    scanner.pos = posBefore; // rewind, we'll continue parsing as usual

    // If no "shouldStop" option was provided, we should have consumed the whole
    // input.
    if (! shouldStop)
      scanner.fatal("Expected EOF");
  }

  return result;
};

// Take a numeric Unicode code point, which may be larger than 16 bits,
// and encode it as a JavaScript UTF-16 string.
//
// Adapted from
// http://stackoverflow.com/questions/7126384/expressing-utf-16-unicode-characters-in-javascript/7126661.
codePointToString = HTMLTools.codePointToString = function(cp) {
  if (cp >= 0 && cp <= 0xD7FF || cp >= 0xE000 && cp <= 0xFFFF) {
    return String.fromCharCode(cp);
  } else if (cp >= 0x10000 && cp <= 0x10FFFF) {

    // we substract 0x10000 from cp to get a 20-bit number
    // in the range 0..0xFFFF
    cp -= 0x10000;

    // we add 0xD800 to the number formed by the first 10 bits
    // to give the first byte
    var first = ((0xffc00 & cp) >> 10) + 0xD800;

    // we add 0xDC00 to the number formed by the low 10 bits
    // to give the second byte
    var second = (0x3ff & cp) + 0xDC00;

    return String.fromCharCode(first) + String.fromCharCode(second);
  } else {
    return '';
  }
};

getContent = HTMLTools.Parse.getContent = function (scanner, shouldStopFunc) {
  var items = [];

  while (! scanner.isEOF()) {
    if (shouldStopFunc && shouldStopFunc(scanner))
      break;

    var posBefore = scanner.pos;
    var token = getHTMLToken(scanner);
    if (! token)
      // tokenizer reached EOF on its own, e.g. while scanning
      // template comments like `{{! foo}}`.
      continue;

    if (token.t === 'Doctype') {
      scanner.fatal("Unexpected Doctype");
    } else if (token.t === 'Chars') {
      pushOrAppendString(items, token.v);
    } else if (token.t === 'CharRef') {
      items.push(convertCharRef(token));
    } else if (token.t === 'Comment') {
      items.push(HTML.Comment(token.v));
    } else if (token.t === 'TemplateTag') {
      items.push(token.v);
    } else if (token.t === 'Tag') {
      if (token.isEnd) {
        // Stop when we encounter an end tag at the top level.
        // Rewind; we'll re-parse the end tag later.
        scanner.pos = posBefore;
        break;
      }

      var tagName = token.n;
      // is this an element with no close tag (a BR, HR, IMG, etc.) based
      // on its name?
      var isVoid = HTML.isVoidElement(tagName);
      if (token.isSelfClosing) {
        if (! (isVoid || HTML.isKnownSVGElement(tagName) || tagName.indexOf(':') >= 0))
          scanner.fatal('Only certain elements like BR, HR, IMG, etc. (and foreign elements like SVG) are allowed to self-close');
      }

      // result of parseAttrs may be null
      var attrs = parseAttrs(token.attrs);
      // arrays need to be wrapped in HTML.Attrs(...)
      // when used to construct tags
      if (HTML.isArray(attrs))
        attrs = HTML.Attrs.apply(null, attrs);

      var tagFunc = HTML.getTag(tagName);
      if (isVoid || token.isSelfClosing) {
        items.push(attrs ? tagFunc(attrs) : tagFunc());
      } else {
        // parse HTML tag contents.

        // HTML treats a final `/` in a tag as part of an attribute, as in `<a href=/foo/>`, but the template author who writes `<circle r={{r}}/>`, say, may not be thinking about that, so generate a good error message in the "looks like self-close" case.
        var looksLikeSelfClose = (scanner.input.substr(scanner.pos - 2, 2) === '/>');

        var content = null;
        if (token.n === 'textarea') {
          if (scanner.peek() === '\n')
            scanner.pos++;
          var textareaValue = getRCData(scanner, token.n, shouldStopFunc);
          if (textareaValue) {
            if (attrs instanceof HTML.Attrs) {
              attrs = HTML.Attrs.apply(
                null, attrs.value.concat([{value: textareaValue}]));
            } else {
              attrs = (attrs || {});
              attrs.value = textareaValue;
            }
          }
        } else if (token.n === 'script') {
          content = getRawText(scanner, token.n, shouldStopFunc);
        } else {
          content = getContent(scanner, shouldStopFunc);
        }

        var endTag = getHTMLToken(scanner);

        if (! (endTag && endTag.t === 'Tag' && endTag.isEnd && endTag.n === tagName))
          scanner.fatal('Expected "' + tagName + '" end tag' + (looksLikeSelfClose ? ' -- if the "<' + token.n + ' />" tag was supposed to self-close, try adding a space before the "/"' : ''));

        // XXX support implied end tags in cases allowed by the spec

        // make `content` into an array suitable for applying tag constructor
        // as in `FOO.apply(null, content)`.
        if (content == null)
          content = [];
        else if (! (content instanceof Array))
          content = [content];

        items.push(HTML.getTag(tagName).apply(
          null, (attrs ? [attrs] : []).concat(content)));
      }
    } else {
      scanner.fatal("Unknown token type: " + token.t);
    }
  }

  if (items.length === 0)
    return null;
  else if (items.length === 1)
    return items[0];
  else
    return items;
};

var pushOrAppendString = function (items, string) {
  if (items.length &&
      typeof items[items.length - 1] === 'string')
    items[items.length - 1] += string;
  else
    items.push(string);
};

// get RCDATA to go in the lowercase (or camel case) tagName (e.g. "textarea")
getRCData = HTMLTools.Parse.getRCData = function (scanner, tagName, shouldStopFunc) {
  var items = [];

  while (! scanner.isEOF()) {
    // break at appropriate end tag
    if (tagName && isLookingAtEndTag(scanner, tagName))
      break;

    if (shouldStopFunc && shouldStopFunc(scanner))
      break;

    var token = getHTMLToken(scanner, 'rcdata');
    if (! token)
      // tokenizer reached EOF on its own, e.g. while scanning
      // template comments like `{{! foo}}`.
      continue;

    if (token.t === 'Chars') {
      pushOrAppendString(items, token.v);
    } else if (token.t === 'CharRef') {
      items.push(convertCharRef(token));
    } else if (token.t === 'TemplateTag') {
      items.push(token.v);
    } else {
      // (can't happen)
      scanner.fatal("Unknown or unexpected token type: " + token.t);
    }
  }

  if (items.length === 0)
    return null;
  else if (items.length === 1)
    return items[0];
  else
    return items;
};

var getRawText = function (scanner, tagName, shouldStopFunc) {
  var items = [];

  while (! scanner.isEOF()) {
    // break at appropriate end tag
    if (tagName && isLookingAtEndTag(scanner, tagName))
      break;

    if (shouldStopFunc && shouldStopFunc(scanner))
      break;

    var token = getHTMLToken(scanner, 'rawtext');
    if (! token)
      // tokenizer reached EOF on its own, e.g. while scanning
      // template comments like `{{! foo}}`.
      continue;

    if (token.t === 'Chars') {
      pushOrAppendString(items, token.v);
    } else if (token.t === 'TemplateTag') {
      items.push(token.v);
    } else {
      // (can't happen)
      scanner.fatal("Unknown or unexpected token type: " + token.t);
    }
  }

  if (items.length === 0)
    return null;
  else if (items.length === 1)
    return items[0];
  else
    return items;
};

// Input: A token like `{ t: 'CharRef', v: '&amp;', cp: [38] }`.
//
// Output: A tag like `HTML.CharRef({ html: '&amp;', str: '&' })`.
var convertCharRef = function (token) {
  var codePoints = token.cp;
  var str = '';
  for (var i = 0; i < codePoints.length; i++)
    str += codePointToString(codePoints[i]);
  return HTML.CharRef({ html: token.v, str: str });
};

// Input is always a dictionary (even if zero attributes) and each
// value in the dictionary is an array of `Chars`, `CharRef`,
// and maybe `TemplateTag` tokens.
//
// Output is null if there are zero attributes, and otherwise a
// dictionary, or an array of dictionaries and template tags.
// Each value in the dictionary is HTMLjs (e.g. a
// string or an array of `Chars`, `CharRef`, and `TemplateTag`
// nodes).
//
// An attribute value with no input tokens is represented as "",
// not an empty array, in order to prop open empty attributes
// with no template tags.
var parseAttrs = function (attrs) {
  var result = null;

  if (HTML.isArray(attrs)) {
    // first element is nondynamic attrs, rest are template tags
    var nondynamicAttrs = parseAttrs(attrs[0]);
    if (nondynamicAttrs) {
      result = (result || []);
      result.push(nondynamicAttrs);
    }
    for (var i = 1; i < attrs.length; i++) {
      var token = attrs[i];
      if (token.t !== 'TemplateTag')
        throw new Error("Expected TemplateTag token");
      result = (result || []);
      result.push(token.v);
    }
    return result;
  }

  for (var k in attrs) {
    if (! result)
      result = {};

    var inValue = attrs[k];
    var outParts = [];
    for (var i = 0; i < inValue.length; i++) {
      var token = inValue[i];
      if (token.t === 'CharRef') {
        outParts.push(convertCharRef(token));
      } else if (token.t === 'TemplateTag') {
        outParts.push(token.v);
      } else if (token.t === 'Chars') {
        pushOrAppendString(outParts, token.v);
      }
    }

    var outValue = (inValue.length === 0 ? '' :
                    (outParts.length === 1 ? outParts[0] : outParts));
    var properKey = HTMLTools.properCaseAttributeName(k);
    result[properKey] = outValue;
  }

  return result;
};
  Meteor.HTMLTools = HTMLTools;
};

},{}],9:[function(require,module,exports){
module.exports = function(Meteor) {
  var _ = Meteor.underscore;
  var HTML;
HTML = {};

IDENTITY = function (x) { return x; };
SLICE = Array.prototype.slice;
////////////////////////////// VISITORS

// _assign is like _.extend or the upcoming Object.assign.
// Copy src's own, enumerable properties onto tgt and return
// tgt.
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var _assign = function (tgt, src) {
  for (var k in src) {
    if (_hasOwnProperty.call(src, k))
      tgt[k] = src[k];
  }
  return tgt;
};

HTML.Visitor = function (props) {
  _assign(this, props);
};

HTML.Visitor.def = function (options) {
  _assign(this.prototype, options);
};

HTML.Visitor.extend = function (options) {
  var curType = this;
  var subType = function HTMLVisitorSubtype(/*arguments*/) {
    HTML.Visitor.apply(this, arguments);
  };
  subType.prototype = new curType;
  subType.extend = curType.extend;
  subType.def = curType.def;
  if (options)
    _assign(subType.prototype, options);
  return subType;
};

HTML.Visitor.def({
  visit: function (content/*, ...*/) {
    if (content == null)
      // null or undefined.
      return this.visitNull.apply(this, arguments);

    if (typeof content === 'object') {
      if (content.htmljsType) {
        switch (content.htmljsType) {
        case HTML.Tag.htmljsType:
          return this.visitTag.apply(this, arguments);
        case HTML.CharRef.htmljsType:
          return this.visitCharRef.apply(this, arguments);
        case HTML.Comment.htmljsType:
          return this.visitComment.apply(this, arguments);
        case HTML.Raw.htmljsType:
          return this.visitRaw.apply(this, arguments);
        default:
          throw new Error("Unknown htmljs type: " + content.htmljsType);
        }
      }

      if (HTML.isArray(content))
        return this.visitArray.apply(this, arguments);

      return this.visitObject.apply(this, arguments);

    } else if ((typeof content === 'string') ||
               (typeof content === 'boolean') ||
               (typeof content === 'number')) {
      return this.visitPrimitive.apply(this, arguments);

    } else if (typeof content === 'function') {
      return this.visitFunction.apply(this, arguments);
    }

    throw new Error("Unexpected object in htmljs: " + content);

  },
  visitNull: function (nullOrUndefined/*, ...*/) {},
  visitPrimitive: function (stringBooleanOrNumber/*, ...*/) {},
  visitArray: function (array/*, ...*/) {},
  visitComment: function (comment/*, ...*/) {},
  visitCharRef: function (charRef/*, ...*/) {},
  visitRaw: function (raw/*, ...*/) {},
  visitTag: function (tag/*, ...*/) {},
  visitObject: function (obj/*, ...*/) {
    throw new Error("Unexpected object in htmljs: " + obj);
  },
  visitFunction: function (obj/*, ...*/) {
    throw new Error("Unexpected function in htmljs: " + obj);
  }
});

HTML.TransformingVisitor = HTML.Visitor.extend();
HTML.TransformingVisitor.def({
  visitNull: IDENTITY,
  visitPrimitive: IDENTITY,
  visitArray: function (array/*, ...*/) {
    var argsCopy = SLICE.call(arguments);
    var result = array;
    for (var i = 0; i < array.length; i++) {
      var oldItem = array[i];
      argsCopy[0] = oldItem;
      var newItem = this.visit.apply(this, argsCopy);
      if (newItem !== oldItem) {
        // copy `array` on write
        if (result === array)
          result = array.slice();
        result[i] = newItem;
      }
    }
    return result;
  },
  visitComment: IDENTITY,
  visitCharRef: IDENTITY,
  visitRaw: IDENTITY,
  visitObject: IDENTITY,
  visitFunction: IDENTITY,
  visitTag: function (tag/*, ...*/) {
    var oldChildren = tag.children;
    var argsCopy = SLICE.call(arguments);
    argsCopy[0] = oldChildren;
    var newChildren = this.visitChildren.apply(this, argsCopy);

    var oldAttrs = tag.attrs;
    argsCopy[0] = oldAttrs;
    var newAttrs = this.visitAttributes.apply(this, argsCopy);

    if (newAttrs === oldAttrs && newChildren === oldChildren)
      return tag;

    var newTag = HTML.getTag(tag.tagName).apply(null, newChildren);
    newTag.attrs = newAttrs;
    return newTag;
  },
  visitChildren: function (children/*, ...*/) {
    return this.visitArray.apply(this, arguments);
  },
  // Transform the `.attrs` property of a tag, which may be a dictionary,
  // an array, or in some uses, a foreign object (such as
  // a template tag).
  visitAttributes: function (attrs/*, ...*/) {
    if (HTML.isArray(attrs)) {
      var argsCopy = SLICE.call(arguments);
      var result = attrs;
      for (var i = 0; i < attrs.length; i++) {
        var oldItem = attrs[i];
        argsCopy[0] = oldItem;
        var newItem = this.visitAttributes.apply(this, argsCopy);
        if (newItem !== oldItem) {
          // copy on write
          if (result === attrs)
            result = attrs.slice();
          result[i] = newItem;
        }
      }
      return result;
    }

    if (attrs && HTML.isConstructedObject(attrs)) {
      throw new Error("The basic HTML.TransformingVisitor does not support " +
                      "foreign objects in attributes.  Define a custom " +
                      "visitAttributes for this case.");
    }

    var oldAttrs = attrs;
    var newAttrs = oldAttrs;
    if (oldAttrs) {
      var attrArgs = [null, null];
      attrArgs.push.apply(attrArgs, arguments);
      for (var k in oldAttrs) {
        var oldValue = oldAttrs[k];
        attrArgs[0] = k;
        attrArgs[1] = oldValue;
        var newValue = this.visitAttribute.apply(this, attrArgs);
        if (newValue !== oldValue) {
          // copy on write
          if (newAttrs === oldAttrs)
            newAttrs = _assign({}, oldAttrs);
          newAttrs[k] = newValue;
        }
      }
    }

    return newAttrs;
  },
  // Transform the value of one attribute name/value in an
  // attributes dictionary.
  visitAttribute: function (name, value, tag/*, ...*/) {
    var args = SLICE.call(arguments, 2);
    args[0] = value;
    return this.visit.apply(this, args);
  }
});


HTML.ToTextVisitor = HTML.Visitor.extend();
HTML.ToTextVisitor.def({
  visitNull: function (nullOrUndefined) {
    return '';
  },
  visitPrimitive: function (stringBooleanOrNumber) {
    var str = String(stringBooleanOrNumber);
    if (this.textMode === HTML.TEXTMODE.RCDATA) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    } else if (this.textMode === HTML.TEXTMODE.ATTRIBUTE) {
      // escape `&` and `"` this time, not `&` and `<`
      return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    } else {
      return str;
    }
  },
  visitArray: function (array) {
    var parts = [];
    for (var i = 0; i < array.length; i++)
      parts.push(this.visit(array[i]));
    return parts.join('');
  },
  visitComment: function (comment) {
    throw new Error("Can't have a comment here");
  },
  visitCharRef: function (charRef) {
    if (this.textMode === HTML.TEXTMODE.RCDATA ||
        this.textMode === HTML.TEXTMODE.ATTRIBUTE) {
      return charRef.html;
    } else {
      return charRef.str;
    }
  },
  visitRaw: function (raw) {
    return raw.value;
  },
  visitTag: function (tag) {
    // Really we should just disallow Tags here.  However, at the
    // moment it's useful to stringify any HTML we find.  In
    // particular, when you include a template within `{{#markdown}}`,
    // we render the template as text, and since there's currently
    // no way to make the template be *parsed* as text (e.g. `<template
    // type="text">`), we hackishly support HTML tags in markdown
    // in templates by parsing them and stringifying them.
    return this.visit(this.toHTML(tag));
  },
  visitObject: function (x) {
    throw new Error("Unexpected object in htmljs in toText: " + x);
  },
  toHTML: function (node) {
    return HTML.toHTML(node);
  }
});



HTML.ToHTMLVisitor = HTML.Visitor.extend();
HTML.ToHTMLVisitor.def({
  visitNull: function (nullOrUndefined) {
    return '';
  },
  visitPrimitive: function (stringBooleanOrNumber) {
    var str = String(stringBooleanOrNumber);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  },
  visitArray: function (array) {
    var parts = [];
    for (var i = 0; i < array.length; i++)
      parts.push(this.visit(array[i]));
    return parts.join('');
  },
  visitComment: function (comment) {
    return '<!--' + comment.sanitizedValue + '-->';
  },
  visitCharRef: function (charRef) {
    return charRef.html;
  },
  visitRaw: function (raw) {
    return raw.value;
  },
  visitTag: function (tag) {
    var attrStrs = [];

    var tagName = tag.tagName;
    var children = tag.children;

    var attrs = tag.attrs;
    if (attrs) {
      attrs = HTML.flattenAttributes(attrs);
      for (var k in attrs) {
        if (k === 'value' && tagName === 'textarea') {
          children = [attrs[k], children];
        } else {
          var v = this.toText(attrs[k], HTML.TEXTMODE.ATTRIBUTE);
          attrStrs.push(' ' + k + '="' + v + '"');
        }
      }
    }

    var startTag = '<' + tagName + attrStrs.join('') + '>';

    var childStrs = [];
    var content;
    if (tagName === 'textarea') {

      for (var i = 0; i < children.length; i++)
        childStrs.push(this.toText(children[i], HTML.TEXTMODE.RCDATA));

      content = childStrs.join('');
      if (content.slice(0, 1) === '\n')
        // TEXTAREA will absorb a newline, so if we see one, add
        // another one.
        content = '\n' + content;

    } else {
      for (var i = 0; i < children.length; i++)
        childStrs.push(this.visit(children[i]));

      content = childStrs.join('');
    }

    var result = startTag + content;

    if (children.length || ! HTML.isVoidElement(tagName)) {
      // "Void" elements like BR are the only ones that don't get a close
      // tag in HTML5.  They shouldn't have contents, either, so we could
      // throw an error upon seeing contents here.
      result += '</' + tagName + '>';
    }

    return result;
  },
  visitObject: function (x) {
    throw new Error("Unexpected object in htmljs in toHTML: " + x);
  },
  toText: function (node, textMode) {
    return HTML.toText(node, textMode);
  }
});


HTML.Tag = function () {};
HTML.Tag.prototype.tagName = ''; // this will be set per Tag subclass
HTML.Tag.prototype.attrs = null;
HTML.Tag.prototype.children = Object.freeze ? Object.freeze([]) : [];
HTML.Tag.prototype.htmljsType = HTML.Tag.htmljsType = ['Tag'];

// Given "p" create the function `HTML.P`.
var makeTagConstructor = function (tagName) {
  // HTMLTag is the per-tagName constructor of a HTML.Tag subclass
  var HTMLTag = function (/*arguments*/) {
    // Work with or without `new`.  If not called with `new`,
    // perform instantiation by recursively calling this constructor.
    // We can't pass varargs, so pass no args.
    var instance = (this instanceof HTML.Tag) ? this : new HTMLTag;

    var i = 0;
    var attrs = arguments.length && arguments[0];
    if (attrs && (typeof attrs === 'object')) {
      // Treat vanilla JS object as an attributes dictionary.
      if (! HTML.isConstructedObject(attrs)) {
        instance.attrs = attrs;
        i++;
      } else if (attrs instanceof HTML.Attrs) {
        var array = attrs.value;
        if (array.length === 1) {
          instance.attrs = array[0];
        } else if (array.length > 1) {
          instance.attrs = array;
        }
        i++;
      }
    }


    // If no children, don't create an array at all, use the prototype's
    // (frozen, empty) array.  This way we don't create an empty array
    // every time someone creates a tag without `new` and this constructor
    // calls itself with no arguments (above).
    if (i < arguments.length)
      instance.children = SLICE.call(arguments, i);

    return instance;
  };
  HTMLTag.prototype = new HTML.Tag;
  HTMLTag.prototype.constructor = HTMLTag;
  HTMLTag.prototype.tagName = tagName;

  return HTMLTag;
};

// Not an HTMLjs node, but a wrapper to pass multiple attrs dictionaries
// to a tag (for the purpose of implementing dynamic attributes).
var Attrs = HTML.Attrs = function (/*attrs dictionaries*/) {
  // Work with or without `new`.  If not called with `new`,
  // perform instantiation by recursively calling this constructor.
  // We can't pass varargs, so pass no args.
  var instance = (this instanceof Attrs) ? this : new Attrs;

  instance.value = SLICE.call(arguments);

  return instance;
};

////////////////////////////// KNOWN ELEMENTS

HTML.getTag = function (tagName) {
  var symbolName = HTML.getSymbolName(tagName);
  if (symbolName === tagName) // all-caps tagName
    throw new Error("Use the lowercase or camelCase form of '" + tagName + "' here");

  if (! HTML[symbolName])
    HTML[symbolName] = makeTagConstructor(tagName);

  return HTML[symbolName];
};

HTML.ensureTag = function (tagName) {
  HTML.getTag(tagName); // don't return it
};

HTML.isTagEnsured = function (tagName) {
  return HTML.isKnownElement(tagName);
};

HTML.getSymbolName = function (tagName) {
  // "foo-bar" -> "FOO_BAR"
  return tagName.toUpperCase().replace(/-/g, '_');
};

HTML.knownElementNames = 'a abbr acronym address applet area article aside audio b base basefont bdi bdo big blockquote body br button canvas caption center cite code col colgroup command data datagrid datalist dd del details dfn dir div dl dt em embed eventsource fieldset figcaption figure font footer form frame frameset h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins isindex kbd keygen label legend li link main map mark menu meta meter nav noframes noscript object ol optgroup option output p param pre progress q rp rt ruby s samp script section select small source span strike strong style sub summary sup table tbody td textarea tfoot th thead time title tr track tt u ul var video wbr'.split(' ');
// (we add the SVG ones below)

HTML.knownSVGElementNames = 'altGlyph altGlyphDef altGlyphItem animate animateColor animateMotion animateTransform circle clipPath color-profile cursor defs desc ellipse feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence filter font font-face font-face-format font-face-name font-face-src font-face-uri foreignObject g glyph glyphRef hkern image line linearGradient marker mask metadata missing-glyph path pattern polygon polyline radialGradient rect script set stop style svg switch symbol text textPath title tref tspan use view vkern'.split(' ');
// Append SVG element names to list of known element names
HTML.knownElementNames = HTML.knownElementNames.concat(HTML.knownSVGElementNames);

HTML.voidElementNames = 'area base br col command embed hr img input keygen link meta param source track wbr'.split(' ');

// Speed up search through lists of known elements by creating internal "sets"
// of strings.
var YES = {yes:true};
var makeSet = function (array) {
  var set = {};
  for (var i = 0; i < array.length; i++)
    set[array[i]] = YES;
  return set;
};
var voidElementSet = makeSet(HTML.voidElementNames);
var knownElementSet = makeSet(HTML.knownElementNames);
var knownSVGElementSet = makeSet(HTML.knownSVGElementNames);

HTML.isKnownElement = function (tagName) {
  return knownElementSet[tagName] === YES;
};

HTML.isKnownSVGElement = function (tagName) {
  return knownSVGElementSet[tagName] === YES;
};

HTML.isVoidElement = function (tagName) {
  return voidElementSet[tagName] === YES;
};


// Ensure tags for all known elements
for (var i = 0; i < HTML.knownElementNames.length; i++)
  HTML.ensureTag(HTML.knownElementNames[i]);


var CharRef = HTML.CharRef = function (attrs) {
  if (! (this instanceof CharRef))
    // called without `new`
    return new CharRef(attrs);

  if (! (attrs && attrs.html && attrs.str))
    throw new Error(
      "HTML.CharRef must be constructed with ({html:..., str:...})");

  this.html = attrs.html;
  this.str = attrs.str;
};
CharRef.prototype.htmljsType = CharRef.htmljsType = ['CharRef'];

var Comment = HTML.Comment = function (value) {
  if (! (this instanceof Comment))
    // called without `new`
    return new Comment(value);

  if (typeof value !== 'string')
    throw new Error('HTML.Comment must be constructed with a string');

  this.value = value;
  // Kill illegal hyphens in comment value (no way to escape them in HTML)
  this.sanitizedValue = value.replace(/^-|--+|-$/g, '');
};
Comment.prototype.htmljsType = Comment.htmljsType = ['Comment'];

var Raw = HTML.Raw = function (value) {
  if (! (this instanceof Raw))
    // called without `new`
    return new Raw(value);

  if (typeof value !== 'string')
    throw new Error('HTML.Raw must be constructed with a string');

  this.value = value;
};
Raw.prototype.htmljsType = Raw.htmljsType = ['Raw'];


HTML.isArray = function (x) {
  // could change this to use the more convoluted Object.prototype.toString
  // approach that works when objects are passed between frames, but does
  // it matter?
  return (x instanceof Array);
};

HTML.isConstructedObject = function (x) {
  return (x && (typeof x === 'object') &&
          (x.constructor !== Object) &&
          (! Object.prototype.hasOwnProperty.call(x, 'constructor')));
};

HTML.isNully = function (node) {
  if (node == null)
    // null or undefined
    return true;

  if (HTML.isArray(node)) {
    // is it an empty array or an array of all nully items?
    for (var i = 0; i < node.length; i++)
      if (! HTML.isNully(node[i]))
        return false;
    return true;
  }

  return false;
};

HTML.isValidAttributeName = function (name) {
  return /^[:_A-Za-z][:_A-Za-z0-9.\-]*/.test(name);
};

// If `attrs` is an array of attributes dictionaries, combines them
// into one.  Removes attributes that are "nully."
HTML.flattenAttributes = function (attrs) {
  if (! attrs)
    return attrs;

  var isArray = HTML.isArray(attrs);
  if (isArray && attrs.length === 0)
    return null;

  var result = {};
  for (var i = 0, N = (isArray ? attrs.length : 1); i < N; i++) {
    var oneAttrs = (isArray ? attrs[i] : attrs);
    if ((typeof oneAttrs !== 'object') ||
        HTML.isConstructedObject(oneAttrs))
      throw new Error("Expected plain JS object as attrs, found: " + oneAttrs);
    for (var name in oneAttrs) {
      if (! HTML.isValidAttributeName(name))
        throw new Error("Illegal HTML attribute name: " + name);
      var value = oneAttrs[name];
      if (! HTML.isNully(value))
        result[name] = value;
    }
  }

  return result;
};



////////////////////////////// TOHTML

HTML.toHTML = function (content) {
  return (new HTML.ToHTMLVisitor).visit(content);
};

// Escaping modes for outputting text when generating HTML.
HTML.TEXTMODE = {
  STRING: 1,
  RCDATA: 2,
  ATTRIBUTE: 3
};


HTML.toText = function (content, textMode) {
  if (! textMode)
    throw new Error("textMode required for HTML.toText");
  if (! (textMode === HTML.TEXTMODE.STRING ||
         textMode === HTML.TEXTMODE.RCDATA ||
         textMode === HTML.TEXTMODE.ATTRIBUTE))
    throw new Error("Unknown textMode: " + textMode);

  var visitor = new HTML.ToTextVisitor({textMode: textMode});;
  return visitor.visit(content);
};
  Meteor.HTML = HTML;
};

},{}],10:[function(require,module,exports){
module.exports = function(Meteor) {
  var _ = Meteor.underscore;
  var IdMap;
IdMap = function (idStringify, idParse) {
  var self = this;
  self._map = {};
  self._idStringify = idStringify || JSON.stringify;
  self._idParse = idParse || JSON.parse;
};

// Some of these methods are designed to match methods on OrderedDict, since
// (eg) ObserveMultiplex and _CachingChangeObserver use them interchangeably.
// (Conceivably, this should be replaced with "UnorderedDict" with a specific
// set of methods that overlap between the two.)

_.extend(IdMap.prototype, {
  get: function (id) {
    var self = this;
    var key = self._idStringify(id);
    return self._map[key];
  },
  set: function (id, value) {
    var self = this;
    var key = self._idStringify(id);
    self._map[key] = value;
  },
  remove: function (id) {
    var self = this;
    var key = self._idStringify(id);
    delete self._map[key];
  },
  has: function (id) {
    var self = this;
    var key = self._idStringify(id);
    return _.has(self._map, key);
  },
  empty: function () {
    var self = this;
    return _.isEmpty(self._map);
  },
  clear: function () {
    var self = this;
    self._map = {};
  },
  // Iterates over the items in the map. Return `false` to break the loop.
  forEach: function (iterator) {
    var self = this;
    // don't use _.each, because we can't break out of it.
    var keys = _.keys(self._map);
    for (var i = 0; i < keys.length; i++) {
      var breakIfFalse = iterator.call(null, self._map[keys[i]],
                                       self._idParse(keys[i]));
      if (breakIfFalse === false)
        return;
    }
  },
  size: function () {
    var self = this;
    return _.size(self._map);
  },
  setDefault: function (id, def) {
    var self = this;
    var key = self._idStringify(id);
    if (_.has(self._map, key))
      return self._map[key];
    self._map[key] = def;
    return def;
  },
  // Assumes that values are EJSON-cloneable, and that we don't need to clone
  // IDs (ie, that nobody is going to mutate an ObjectId).
  clone: function () {
    var self = this;
    var clone = new IdMap(self._idStringify, self._idParse);
    self.forEach(function (value, id) {
      clone.set(id, EJSON.clone(value));
    });
    return clone;
  }
});

  Meteor.IdMap = IdMap;
};

},{}],11:[function(require,module,exports){
module.exports = function(Meteor) {
  var _ = Meteor.underscore;
  var Random = Meteor.Random;
  var Tracker = Meteor.Tracker;
  var LocalCollection = Meteor.LocalCollection;
  var ReactiveVar = Meteor.ReactiveVar;
  var EJSON = Meteor.EJSON;
  var ObserveSequence;

  //Copied from minimongo package to remove dependency, as this code should go into a helper package
  var LocalCollection = {};
  var Package = {minimongo: {LocalCollection: LocalCollection}};


// NB: used by livedata
LocalCollection._idStringify = function (id) {
  if (id instanceof LocalCollection._ObjectID) {
    return id.valueOf();
  } else if (typeof id === 'string') {
    if (id === "") {
      return id;
    } else if (id.substr(0, 1) === "-" || // escape previously dashed strings
               id.substr(0, 1) === "~" || // escape escaped numbers, true, false
               LocalCollection._looksLikeObjectID(id) || // escape object-id-form strings
               id.substr(0, 1) === '{') { // escape object-form strings, for maybe implementing later
      return "-" + id;
    } else {
      return id; // other strings go through unchanged.
    }
  } else if (id === undefined) {
    return '-';
  } else if (typeof id === 'object' && id !== null) {
    throw new Error("Meteor does not currently support objects other than ObjectID as ids");
  } else { // Numbers, true, false, null
    return "~" + JSON.stringify(id);
  }
};


// NB: used by livedata
LocalCollection._idParse = function (id) {
  if (id === "") {
    return id;
  } else if (id === '-') {
    return undefined;
  } else if (id.substr(0, 1) === '-') {
    return id.substr(1);
  } else if (id.substr(0, 1) === '~') {
    return JSON.parse(id.substr(1));
  } else if (LocalCollection._looksLikeObjectID(id)) {
    return new LocalCollection._ObjectID(id);
  } else {
    return id;
  }
};

LocalCollection._makeChangedFields = function (newDoc, oldDoc) {
  var fields = {};
  LocalCollection._diffObjects(oldDoc, newDoc, {
    leftOnly: function (key, value) {
      fields[key] = undefined;
    },
    rightOnly: function (key, value) {
      fields[key] = value;
    },
    both: function (key, leftValue, rightValue) {
      if (!EJSON.equals(leftValue, rightValue))
        fields[key] = rightValue;
    }
  });
  return fields;
};

// Is this selector just shorthand for lookup by _id?
LocalCollection._selectorIsId = function (selector) {
  return (typeof selector === "string") ||
    (typeof selector === "number") ||
    selector instanceof LocalCollection._ObjectID;
};

// ordered: bool.
// old_results and new_results: collections of documents.
//    if ordered, they are arrays.
//    if unordered, they are IdMaps
LocalCollection._diffQueryChanges = function (ordered, oldResults, newResults,
                                       observer) {
  if (ordered)
    LocalCollection._diffQueryOrderedChanges(
      oldResults, newResults, observer);
  else
    LocalCollection._diffQueryUnorderedChanges(
      oldResults, newResults, observer);
};

LocalCollection._diffQueryUnorderedChanges = function (oldResults, newResults,
                                                       observer) {
  if (observer.movedBefore) {
    throw new Error("_diffQueryUnordered called with a movedBefore observer!");
  }

  newResults.forEach(function (newDoc, id) {
    var oldDoc = oldResults.get(id);
    if (oldDoc) {
      if (observer.changed && !EJSON.equals(oldDoc, newDoc)) {
        observer.changed(
          id, LocalCollection._makeChangedFields(newDoc, oldDoc));
      }
    } else if (observer.added) {
      var fields = EJSON.clone(newDoc);
      delete fields._id;
      observer.added(newDoc._id, fields);
    }
  });

  if (observer.removed) {
    oldResults.forEach(function (oldDoc, id) {
      if (!newResults.has(id))
        observer.removed(id);
    });
  }
};


LocalCollection._diffQueryOrderedChanges = function (old_results, new_results, observer) {

  var new_presence_of_id = {};
  _.each(new_results, function (doc) {
    if (new_presence_of_id[doc._id])
      Meteor._debug("Duplicate _id in new_results");
    new_presence_of_id[doc._id] = true;
  });

  var old_index_of_id = {};
  _.each(old_results, function (doc, i) {
    if (doc._id in old_index_of_id)
      Meteor._debug("Duplicate _id in old_results");
    old_index_of_id[doc._id] = i;
  });

  // ALGORITHM:
  //
  // To determine which docs should be considered "moved" (and which
  // merely change position because of other docs moving) we run
  // a "longest common subsequence" (LCS) algorithm.  The LCS of the
  // old doc IDs and the new doc IDs gives the docs that should NOT be
  // considered moved.

  // To actually call the appropriate callbacks to get from the old state to the
  // new state:

  // First, we call removed() on all the items that only appear in the old
  // state.

  // Then, once we have the items that should not move, we walk through the new
  // results array group-by-group, where a "group" is a set of items that have
  // moved, anchored on the end by an item that should not move.  One by one, we
  // move each of those elements into place "before" the anchoring end-of-group
  // item, and fire changed events on them if necessary.  Then we fire a changed
  // event on the anchor, and move on to the next group.  There is always at
  // least one group; the last group is anchored by a virtual "null" id at the
  // end.

  // Asymptotically: O(N k) where k is number of ops, or potentially
  // O(N log N) if inner loop of LCS were made to be binary search.


  //////// LCS (longest common sequence, with respect to _id)
  // (see Wikipedia article on Longest Increasing Subsequence,
  // where the LIS is taken of the sequence of old indices of the
  // docs in new_results)
  //
  // unmoved: the output of the algorithm; members of the LCS,
  // in the form of indices into new_results
  var unmoved = [];
  // max_seq_len: length of LCS found so far
  var max_seq_len = 0;
  // seq_ends[i]: the index into new_results of the last doc in a
  // common subsequence of length of i+1 <= max_seq_len
  var N = new_results.length;
  var seq_ends = new Array(N);
  // ptrs:  the common subsequence ending with new_results[n] extends
  // a common subsequence ending with new_results[ptr[n]], unless
  // ptr[n] is -1.
  var ptrs = new Array(N);
  // virtual sequence of old indices of new results
  var old_idx_seq = function(i_new) {
    return old_index_of_id[new_results[i_new]._id];
  };
  // for each item in new_results, use it to extend a common subsequence
  // of length j <= max_seq_len
  for(var i=0; i<N; i++) {
    if (old_index_of_id[new_results[i]._id] !== undefined) {
      var j = max_seq_len;
      // this inner loop would traditionally be a binary search,
      // but scanning backwards we will likely find a subseq to extend
      // pretty soon, bounded for example by the total number of ops.
      // If this were to be changed to a binary search, we'd still want
      // to scan backwards a bit as an optimization.
      while (j > 0) {
        if (old_idx_seq(seq_ends[j-1]) < old_idx_seq(i))
          break;
        j--;
      }

      ptrs[i] = (j === 0 ? -1 : seq_ends[j-1]);
      seq_ends[j] = i;
      if (j+1 > max_seq_len)
        max_seq_len = j+1;
    }
  }

  // pull out the LCS/LIS into unmoved
  var idx = (max_seq_len === 0 ? -1 : seq_ends[max_seq_len-1]);
  while (idx >= 0) {
    unmoved.push(idx);
    idx = ptrs[idx];
  }
  // the unmoved item list is built backwards, so fix that
  unmoved.reverse();

  // the last group is always anchored by the end of the result list, which is
  // an id of "null"
  unmoved.push(new_results.length);

  _.each(old_results, function (doc) {
    if (!new_presence_of_id[doc._id])
      observer.removed && observer.removed(doc._id);
  });
  // for each group of things in the new_results that is anchored by an unmoved
  // element, iterate through the things before it.
  var startOfGroup = 0;
  _.each(unmoved, function (endOfGroup) {
    var groupId = new_results[endOfGroup] ? new_results[endOfGroup]._id : null;
    var oldDoc;
    var newDoc;
    var fields;
    for (var i = startOfGroup; i < endOfGroup; i++) {
      newDoc = new_results[i];
      if (!_.has(old_index_of_id, newDoc._id)) {
        fields = EJSON.clone(newDoc);
        delete fields._id;
        observer.addedBefore && observer.addedBefore(newDoc._id, fields, groupId);
        observer.added && observer.added(newDoc._id, fields);
      } else {
        // moved
        oldDoc = old_results[old_index_of_id[newDoc._id]];
        fields = LocalCollection._makeChangedFields(newDoc, oldDoc);
        if (!_.isEmpty(fields)) {
          observer.changed && observer.changed(newDoc._id, fields);
        }
        observer.movedBefore && observer.movedBefore(newDoc._id, groupId);
      }
    }
    if (groupId) {
      newDoc = new_results[endOfGroup];
      oldDoc = old_results[old_index_of_id[newDoc._id]];
      fields = LocalCollection._makeChangedFields(newDoc, oldDoc);
      if (!_.isEmpty(fields)) {
        observer.changed && observer.changed(newDoc._id, fields);
      }
    }
    startOfGroup = endOfGroup+1;
  });


};


// General helper for diff-ing two objects.
// callbacks is an object like so:
// { leftOnly: function (key, leftValue) {...},
//   rightOnly: function (key, rightValue) {...},
//   both: function (key, leftValue, rightValue) {...},
// }
LocalCollection._diffObjects = function (left, right, callbacks) {
  _.each(left, function (leftValue, key) {
    if (_.has(right, key))
      callbacks.both && callbacks.both(key, leftValue, right[key]);
    else
      callbacks.leftOnly && callbacks.leftOnly(key, leftValue);
  });
  if (callbacks.rightOnly) {
    _.each(right, function(rightValue, key) {
      if (!_.has(left, key))
        callbacks.rightOnly(key, rightValue);
    });
  }
};
LocalCollection._looksLikeObjectID = function (str) {
  return str.length === 24 && str.match(/^[0-9a-f]*$/);
};

LocalCollection._ObjectID = function (hexString) {
  //random-based impl of Mongo ObjectID
  var self = this;
  if (hexString) {
    hexString = hexString.toLowerCase();
    if (!LocalCollection._looksLikeObjectID(hexString)) {
      throw new Error("Invalid hexadecimal string for creating an ObjectID");
    }
    // meant to work with _.isEqual(), which relies on structural equality
    self._str = hexString;
  } else {
    self._str = Random.hexString(24);
  }
};

LocalCollection._ObjectID.prototype.toString = function () {
  var self = this;
  return "ObjectID(\"" + self._str + "\")";
};

LocalCollection._ObjectID.prototype.equals = function (other) {
  var self = this;
  return other instanceof LocalCollection._ObjectID &&
    self.valueOf() === other.valueOf();
};

LocalCollection._ObjectID.prototype.clone = function () {
  var self = this;
  return new LocalCollection._ObjectID(self._str);
};

LocalCollection._ObjectID.prototype.typeName = function() {
  return "oid";
};

LocalCollection._ObjectID.prototype.getTimestamp = function() {
  var self = this;
  return parseInt(self._str.substr(0, 8), 16);
};

LocalCollection._ObjectID.prototype.valueOf =
    LocalCollection._ObjectID.prototype.toJSONValue =
    LocalCollection._ObjectID.prototype.toHexString =
    function () { return this._str; };

// Is this selector just shorthand for lookup by _id?
LocalCollection._selectorIsId = function (selector) {
  return (typeof selector === "string") ||
    (typeof selector === "number") ||
    selector instanceof LocalCollection._ObjectID;
};

// Is the selector just lookup by _id (shorthand or not)?
LocalCollection._selectorIsIdPerhapsAsObject = function (selector) {
  return LocalCollection._selectorIsId(selector) ||
    (selector && typeof selector === "object" &&
     selector._id && LocalCollection._selectorIsId(selector._id) &&
     _.size(selector) === 1);
};

// If this is a selector which explicitly constrains the match by ID to a finite
// number of documents, returns a list of their IDs.  Otherwise returns
// null. Note that the selector may have other restrictions so it may not even
// match those document!  We care about $in and $and since those are generated
// access-controlled update and remove.
LocalCollection._idsMatchedBySelector = function (selector) {
  // Is the selector just an ID?
  if (LocalCollection._selectorIsId(selector))
    return [selector];
  if (!selector)
    return null;

  // Do we have an _id clause?
  if (_.has(selector, '_id')) {
    // Is the _id clause just an ID?
    if (LocalCollection._selectorIsId(selector._id))
      return [selector._id];
    // Is the _id clause {_id: {$in: ["x", "y", "z"]}}?
    if (selector._id && selector._id.$in
        && _.isArray(selector._id.$in)
        && !_.isEmpty(selector._id.$in)
        && _.all(selector._id.$in, LocalCollection._selectorIsId)) {
      return selector._id.$in;
    }
    return null;
  }

  // If this is a top-level $and, and any of the clauses constrain their
  // documents, then the whole selector is constrained by any one clause's
  // constraint. (Well, by their intersection, but that seems unlikely.)
  if (selector.$and && _.isArray(selector.$and)) {
    for (var i = 0; i < selector.$and.length; ++i) {
      var subIds = LocalCollection._idsMatchedBySelector(selector.$and[i]);
      if (subIds)
        return subIds;
    }
  }

  return null;
};

EJSON.addType("oid",  function (str) {
  return new LocalCollection._ObjectID(str);
});
var warn = function () {
  if (ObserveSequence._suppressWarnings) {
    ObserveSequence._suppressWarnings--;
  } else {
    if (typeof console !== 'undefined' && console.warn)
      console.warn.apply(console, arguments);

    ObserveSequence._loggedWarnings++;
  }
};

var idStringify = LocalCollection._idStringify;
var idParse = LocalCollection._idParse;

ObserveSequence = {
  _suppressWarnings: 0,
  _loggedWarnings: 0,

  // A mechanism similar to cursor.observe which receives a reactive
  // function returning a sequence type and firing appropriate callbacks
  // when the value changes.
  //
  // @param sequenceFunc {Function} a reactive function returning a
  //     sequence type. The currently supported sequence types are:
  //     'null', arrays and cursors.
  //
  // @param callbacks {Object} similar to a specific subset of
  //     callbacks passed to `cursor.observe`
  //     (http://docs.meteor.com/#observe), with minor variations to
  //     support the fact that not all sequences contain objects with
  //     _id fields.  Specifically:
  //
  //     * addedAt(id, item, atIndex, beforeId)
  //     * changedAt(id, newItem, oldItem, atIndex)
  //     * removedAt(id, oldItem, atIndex)
  //     * movedTo(id, item, fromIndex, toIndex, beforeId)
  //
  // @returns {Object(stop: Function)} call 'stop' on the return value
  //     to stop observing this sequence function.
  //
  // We don't make any assumptions about our ability to compare sequence
  // elements (ie, we don't assume EJSON.equals works; maybe there is extra
  // state/random methods on the objects) so unlike cursor.observe, we may
  // sometimes call changedAt() when nothing actually changed.
  // XXX consider if we *can* make the stronger assumption and avoid
  //     no-op changedAt calls (in some cases?)
  //
  // XXX currently only supports the callbacks used by our
  // implementation of {{#each}}, but this can be expanded.
  //
  // XXX #each doesn't use the indices (though we'll eventually need
  // a way to get them when we support `@index`), but calling
  // `cursor.observe` causes the index to be calculated on every
  // callback using a linear scan (unless you turn it off by passing
  // `_no_indices`).  Any way to avoid calculating indices on a pure
  // cursor observe like we used to?
  observe: function (sequenceFunc, callbacks) {
    var lastSeq = null;
    var activeObserveHandle = null;

    // 'lastSeqArray' contains the previous value of the sequence
    // we're observing. It is an array of objects with '_id' and
    // 'item' fields.  'item' is the element in the array, or the
    // document in the cursor.
    //
    // '_id' is whichever of the following is relevant, unless it has
    // already appeared -- in which case it's randomly generated.
    //
    // * if 'item' is an object:
    //   * an '_id' field, if present
    //   * otherwise, the index in the array
    //
    // * if 'item' is a number or string, use that value
    //
    // XXX this can be generalized by allowing {{#each}} to accept a
    // general 'key' argument which could be a function, a dotted
    // field name, or the special @index value.
    var lastSeqArray = []; // elements are objects of form {_id, item}
    var computation = Tracker.autorun(function () {
      var seq = sequenceFunc();

      Tracker.nonreactive(function () {
        var seqArray; // same structure as `lastSeqArray` above.

        if (activeObserveHandle) {
          // If we were previously observing a cursor, replace lastSeqArray with
          // more up-to-date information.  Then stop the old observe.
          lastSeqArray = _.map(lastSeq.fetch(), function (doc) {
            return {_id: doc._id, item: doc};
          });
          activeObserveHandle.stop();
          activeObserveHandle = null;
        }

        if (!seq) {
          seqArray = seqChangedToEmpty(lastSeqArray, callbacks);
        } else if (seq instanceof Array) {
          seqArray = seqChangedToArray(lastSeqArray, seq, callbacks);
        } else if (isStoreCursor(seq)) {
          var result /* [seqArray, activeObserveHandle] */ =
                seqChangedToCursor(lastSeqArray, seq, callbacks);
          seqArray = result[0];
          activeObserveHandle = result[1];
        } else {
          throw badSequenceError();
        }

        diffArray(lastSeqArray, seqArray, callbacks);
        lastSeq = seq;
        lastSeqArray = seqArray;
      });
    });

    return {
      stop: function () {
        computation.stop();
        if (activeObserveHandle)
          activeObserveHandle.stop();
      }
    };
  },

  // Fetch the items of `seq` into an array, where `seq` is of one of the
  // sequence types accepted by `observe`.  If `seq` is a cursor, a
  // dependency is established.
  fetch: function (seq) {
    if (!seq) {
      return [];
    } else if (seq instanceof Array) {
      return seq;
    } else if (isStoreCursor(seq)) {
      return seq.fetch();
    } else {
      throw badSequenceError();
    }
  }
};

var badSequenceError = function () {
  return new Error("{{#each}} currently only accepts " +
                   "arrays, cursors or falsey values.");
};

var isStoreCursor = function (cursor) {
  return cursor && _.isObject(cursor) &&
    _.isFunction(cursor.observe) && _.isFunction(cursor.fetch);
};

// Calculates the differences between `lastSeqArray` and
// `seqArray` and calls appropriate functions from `callbacks`.
// Reuses Minimongo's diff algorithm implementation.
var diffArray = function (lastSeqArray, seqArray, callbacks) {
  var diffFn = Package.minimongo.LocalCollection._diffQueryOrderedChanges;
  var oldIdObjects = [];
  var newIdObjects = [];
  var posOld = {}; // maps from idStringify'd ids
  var posNew = {}; // ditto
  var posCur = {};
  var lengthCur = lastSeqArray.length;

  _.each(seqArray, function (doc, i) {
    newIdObjects.push({_id: doc._id});
    posNew[idStringify(doc._id)] = i;
  });
  _.each(lastSeqArray, function (doc, i) {
    oldIdObjects.push({_id: doc._id});
    posOld[idStringify(doc._id)] = i;
    posCur[idStringify(doc._id)] = i;
  });

  // Arrays can contain arbitrary objects. We don't diff the
  // objects. Instead we always fire 'changedAt' callback on every
  // object. The consumer of `observe-sequence` should deal with
  // it appropriately.
  diffFn(oldIdObjects, newIdObjects, {
    addedBefore: function (id, doc, before) {
      var position = before ? posCur[idStringify(before)] : lengthCur;

      _.each(posCur, function (pos, id) {
        if (pos >= position)
          posCur[id]++;
      });

      lengthCur++;
      posCur[idStringify(id)] = position;

      callbacks.addedAt(
        id,
        seqArray[posNew[idStringify(id)]].item,
        position,
        before);
    },
    movedBefore: function (id, before) {
      var prevPosition = posCur[idStringify(id)];
      var position = before ? posCur[idStringify(before)] : lengthCur - 1;

      _.each(posCur, function (pos, id) {
        if (pos >= prevPosition && pos <= position)
          posCur[id]--;
        else if (pos <= prevPosition && pos >= position)
          posCur[id]++;
      });

      posCur[idStringify(id)] = position;

      callbacks.movedTo(
        id,
        seqArray[posNew[idStringify(id)]].item,
        prevPosition,
        position,
        before);
    },
    removed: function (id) {
      var prevPosition = posCur[idStringify(id)];

      _.each(posCur, function (pos, id) {
        if (pos >= prevPosition)
          posCur[id]--;
      });

      delete posCur[idStringify(id)];
      lengthCur--;

      callbacks.removedAt(
        id,
        lastSeqArray[posOld[idStringify(id)]].item,
        prevPosition);
    }
  });

  _.each(posNew, function (pos, idString) {
    var id = idParse(idString);
    if (_.has(posOld, idString)) {
      // specifically for primitive types, compare equality before
      // firing the 'changedAt' callback. otherwise, always fire it
      // because doing a deep EJSON comparison is not guaranteed to
      // work (an array can contain arbitrary objects, and 'transform'
      // can be used on cursors). also, deep diffing is not
      // necessarily the most efficient (if only a specific subfield
      // of the object is later accessed).
      var newItem = seqArray[pos].item;
      var oldItem = lastSeqArray[posOld[idString]].item;

      if (typeof newItem === 'object' || newItem !== oldItem)
          callbacks.changedAt(id, newItem, oldItem, pos);
      }
  });
};

seqChangedToEmpty = function (lastSeqArray, callbacks) {
  return [];
};

seqChangedToArray = function (lastSeqArray, array, callbacks) {
  var idsUsed = {};
  var seqArray = _.map(array, function (item, index) {
    var id;
    if (typeof item === 'string') {
      // ensure not empty, since other layers (eg DomRange) assume this as well
      id = "-" + item;
    } else if (typeof item === 'number' ||
               typeof item === 'boolean' ||
               item === undefined) {
      id = item;
    } else if (typeof item === 'object') {
      id = (item && item._id) || index;
    } else {
      throw new Error("{{#each}} doesn't support arrays with " +
                      "elements of type " + typeof item);
    }

    var idString = idStringify(id);
    if (idsUsed[idString]) {
      if (typeof item === 'object' && '_id' in item)
        warn("duplicate id " + id + " in", array);
      id = Random.id();
    } else {
      idsUsed[idString] = true;
    }

    return { _id: id, item: item };
  });

  return seqArray;
};

seqChangedToCursor = function (lastSeqArray, cursor, callbacks) {
  var initial = true; // are we observing initial data from cursor?
  var seqArray = [];

  var observeHandle = cursor.observe({
    addedAt: function (document, atIndex, before) {
      if (initial) {
        // keep track of initial data so that we can diff once
        // we exit `observe`.
        if (before !== null)
          throw new Error("Expected initial data from observe in order");
        seqArray.push({ _id: document._id, item: document });
      } else {
        callbacks.addedAt(document._id, document, atIndex, before);
      }
    },
    changedAt: function (newDocument, oldDocument, atIndex) {
      callbacks.changedAt(newDocument._id, newDocument, oldDocument,
                          atIndex);
    },
    removedAt: function (oldDocument, atIndex) {
      callbacks.removedAt(oldDocument._id, oldDocument, atIndex);
    },
    movedTo: function (document, fromIndex, toIndex, before) {
      callbacks.movedTo(
        document._id, document, fromIndex, toIndex, before);
    }
  });
  initial = false;

  return [seqArray, observeHandle];
};
  Meteor.ObserveSequence = ObserveSequence;
};

},{}],12:[function(require,module,exports){
module.exports = function(Meteor) {
  var _ = Meteor.underscore;
  var OrderedDict;
// This file defines an ordered dictionary abstraction that is useful for
// maintaining a dataset backed by observeChanges.  It supports ordering items
// by specifying the item they now come before.

// The implementation is a dictionary that contains nodes of a doubly-linked
// list as its values.

// constructs a new element struct
// next and prev are whole elements, not keys.
var element = function (key, value, next, prev) {
  return {
    key: key,
    value: value,
    next: next,
    prev: prev
  };
};
OrderedDict = function (/* ... */) {
  var self = this;
  self._dict = {};
  self._first = null;
  self._last = null;
  self._size = 0;
  var args = _.toArray(arguments);
  self._stringify = function (x) { return x; };
  if (typeof args[0] === 'function')
    self._stringify = args.shift();
  _.each(args, function (kv) {
    self.putBefore(kv[0], kv[1], null);
  });
};

_.extend(OrderedDict.prototype, {
  // the "prefix keys with a space" thing comes from here
  // https://github.com/documentcloud/underscore/issues/376#issuecomment-2815649
  _k: function (key) { return " " + this._stringify(key); },

  empty: function () {
    var self = this;
    return !self._first;
  },
  size: function () {
    var self = this;
    return self._size;
  },
  _linkEltIn: function (elt) {
    var self = this;
    if (!elt.next) {
      elt.prev = self._last;
      if (self._last)
        self._last.next = elt;
      self._last = elt;
    } else {
      elt.prev = elt.next.prev;
      elt.next.prev = elt;
      if (elt.prev)
        elt.prev.next = elt;
    }
    if (self._first === null || self._first === elt.next)
      self._first = elt;
  },
  _linkEltOut: function (elt) {
    var self = this;
    if (elt.next)
      elt.next.prev = elt.prev;
    if (elt.prev)
      elt.prev.next = elt.next;
    if (elt === self._last)
      self._last = elt.prev;
    if (elt === self._first)
      self._first = elt.next;
  },
  putBefore: function (key, item, before) {
    var self = this;
    if (self._dict[self._k(key)])
      throw new Error("Item " + key + " already present in OrderedDict");
    var elt = before ?
          element(key, item, self._dict[self._k(before)]) :
          element(key, item, null);
    if (elt.next === undefined)
      throw new Error("could not find item to put this one before");
    self._linkEltIn(elt);
    self._dict[self._k(key)] = elt;
    self._size++;
  },
  append: function (key, item) {
    var self = this;
    self.putBefore(key, item, null);
  },
  remove: function (key) {
    var self = this;
    var elt = self._dict[self._k(key)];
    if (elt === undefined)
      throw new Error("Item " + key + " not present in OrderedDict");
    self._linkEltOut(elt);
    self._size--;
    delete self._dict[self._k(key)];
    return elt.value;
  },
  get: function (key) {
    var self = this;
    if (self.has(key))
        return self._dict[self._k(key)].value;
    return undefined;
  },
  has: function (key) {
    var self = this;
    return _.has(self._dict, self._k(key));
  },
  // Iterate through the items in this dictionary in order, calling
  // iter(value, key, index) on each one.

  // Stops whenever iter returns OrderedDict.BREAK, or after the last element.
  forEach: function (iter) {
    var self = this;
    var i = 0;
    var elt = self._first;
    while (elt !== null) {
      var b = iter(elt.value, elt.key, i);
      if (b === OrderedDict.BREAK)
        return;
      elt = elt.next;
      i++;
    }
  },
  first: function () {
    var self = this;
    if (self.empty())
      return undefined;
    return self._first.key;
  },
  firstValue: function () {
    var self = this;
    if (self.empty())
      return undefined;
    return self._first.value;
  },
  last: function () {
    var self = this;
    if (self.empty())
      return undefined;
    return self._last.key;
  },
  lastValue: function () {
    var self = this;
    if (self.empty())
      return undefined;
    return self._last.value;
  },
  prev: function (key) {
    var self = this;
    if (self.has(key)) {
      var elt = self._dict[self._k(key)];
      if (elt.prev)
        return elt.prev.key;
    }
    return null;
  },
  next: function (key) {
    var self = this;
    if (self.has(key)) {
      var elt = self._dict[self._k(key)];
      if (elt.next)
        return elt.next.key;
    }
    return null;
  },
  moveBefore: function (key, before) {
    var self = this;
    var elt = self._dict[self._k(key)];
    var eltBefore = before ? self._dict[self._k(before)] : null;
    if (elt === undefined)
      throw new Error("Item to move is not present");
    if (eltBefore === undefined) {
      throw new Error("Could not find element to move this one before");
    }
    if (eltBefore === elt.next) // no moving necessary
      return;
    // remove from its old place
    self._linkEltOut(elt);
    // patch into its new place
    elt.next = eltBefore;
    self._linkEltIn(elt);
  },
  // Linear, sadly.
  indexOf: function (key) {
    var self = this;
    var ret = null;
    self.forEach(function (v, k, i) {
      if (self._k(k) === self._k(key)) {
        ret = i;
        return OrderedDict.BREAK;
      }
      return undefined;
    });
    return ret;
  },
  _checkRep: function () {
    var self = this;
    _.each(self._dict, function (k, v) {
      if (v.next === v)
        throw new Error("Next is a loop");
      if (v.prev === v)
        throw new Error("Prev is a loop");
    });
  }

});
OrderedDict.BREAK = {"break": true};
  Meteor.OrderedDict = OrderedDict;
};

},{}],13:[function(require,module,exports){
module.exports=function(Meteor) {
  var _ = Meteor.underscore;
  var Random;
// We use cryptographically strong PRNGs (crypto.getRandomBytes() on the server,
// window.crypto.getRandomValues() in the browser) when available. If these
// PRNGs fail, we fall back to the Alea PRNG, which is not cryptographically
// strong, and we seed it with various sources such as the date, Math.random,
// and window size on the client.  When using crypto.getRandomValues(), our
// primitive is hexString(), from which we construct fraction(). When using
// window.crypto.getRandomValues() or alea, the primitive is fraction and we use
// that to construct hex string.

if (Meteor.isServer)
  var nodeCrypto = Npm.require('crypto');

// see http://baagoe.org/en/wiki/Better_random_numbers_for_javascript
// for a full discussion and Alea implementation.
var Alea = function () {
  function Mash() {
    var n = 0xefc8249d;

    var mash = function(data) {
      data = data.toString();
      for (var i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        var h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 0x100000000; // 2^32
      }
      return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    };

    mash.version = 'Mash 0.9';
    return mash;
  }

  return (function (args) {
    var s0 = 0;
    var s1 = 0;
    var s2 = 0;
    var c = 1;

    if (args.length == 0) {
      args = [+new Date];
    }
    var mash = Mash();
    s0 = mash(' ');
    s1 = mash(' ');
    s2 = mash(' ');

    for (var i = 0; i < args.length; i++) {
      s0 -= mash(args[i]);
      if (s0 < 0) {
        s0 += 1;
      }
      s1 -= mash(args[i]);
      if (s1 < 0) {
        s1 += 1;
      }
      s2 -= mash(args[i]);
      if (s2 < 0) {
        s2 += 1;
      }
    }
    mash = null;

    var random = function() {
      var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
      s0 = s1;
      s1 = s2;
      return s2 = t - (c = t | 0);
    };
    random.uint32 = function() {
      return random() * 0x100000000; // 2^32
    };
    random.fract53 = function() {
      return random() +
        (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
    };
    random.version = 'Alea 0.9';
    random.args = args;
    return random;

  } (Array.prototype.slice.call(arguments)));
};

var UNMISTAKABLE_CHARS = "23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz";
var BASE64_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "0123456789-_";

// If seeds are provided, then the alea PRNG will be used, since cryptographic
// PRNGs (Node crypto and window.crypto.getRandomValues) don't allow us to
// specify seeds. The caller is responsible for making sure to provide a seed
// for alea if a csprng is not available.
var RandomGenerator = function (seedArray) {
  var self = this;
  if (seedArray !== undefined)
    self.alea = Alea.apply(null, seedArray);
};

RandomGenerator.prototype.fraction = function () {
  var self = this;
  if (self.alea) {
    return self.alea();
  } else if (nodeCrypto) {
    var numerator = parseInt(self.hexString(8), 16);
    return numerator * 2.3283064365386963e-10; // 2^-32
  } else if (typeof window !== "undefined" && window.crypto &&
             window.crypto.getRandomValues) {
    var array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] * 2.3283064365386963e-10; // 2^-32
  } else {
    throw new Error('No random generator available');
  }
};

RandomGenerator.prototype.hexString = function (digits) {
  var self = this;
  if (nodeCrypto && ! self.alea) {
    var numBytes = Math.ceil(digits / 2);
    var bytes;
    // Try to get cryptographically strong randomness. Fall back to
    // non-cryptographically strong if not available.
    try {
      bytes = nodeCrypto.randomBytes(numBytes);
    } catch (e) {
      // XXX should re-throw any error except insufficient entropy
      bytes = nodeCrypto.pseudoRandomBytes(numBytes);
    }
    var result = bytes.toString("hex");
    // If the number of digits is odd, we'll have generated an extra 4 bits
    // of randomness, so we need to trim the last digit.
    return result.substring(0, digits);
  } else {
    var hexDigits = [];
    for (var i = 0; i < digits; ++i) {
      hexDigits.push(self.choice("0123456789abcdef"));
    }
    return hexDigits.join('');
  }
};

RandomGenerator.prototype._randomString = function (charsCount,
                                                    alphabet) {
  var self = this;
  var digits = [];
  for (var i = 0; i < charsCount; i++) {
    digits[i] = self.choice(alphabet);
  }
  return digits.join("");
};

RandomGenerator.prototype.id = function (charsCount) {
  var self = this;
  // 17 characters is around 96 bits of entropy, which is the amount of
  // state in the Alea PRNG.
  if (charsCount === undefined)
    charsCount = 17;

  return self._randomString(charsCount, UNMISTAKABLE_CHARS);
};

RandomGenerator.prototype.secret = function (charsCount) {
  var self = this;
  // Default to 256 bits of entropy, or 43 characters at 6 bits per
  // character.
  if (charsCount === undefined)
    charsCount = 43;
  return self._randomString(charsCount, BASE64_CHARS);
};

RandomGenerator.prototype.choice = function (arrayOrString) {
  var index = Math.floor(this.fraction() * arrayOrString.length);
  if (typeof arrayOrString === "string")
    return arrayOrString.substr(index, 1);
  else
    return arrayOrString[index];
};

// instantiate RNG.  Heuristically collect entropy from various sources when a
// cryptographic PRNG isn't available.

// client sources
var height = (typeof window !== 'undefined' && window.innerHeight) ||
      (typeof document !== 'undefined'
       && document.documentElement
       && document.documentElement.clientHeight) ||
      (typeof document !== 'undefined'
       && document.body
       && document.body.clientHeight) ||
      1;

var width = (typeof window !== 'undefined' && window.innerWidth) ||
      (typeof document !== 'undefined'
       && document.documentElement
       && document.documentElement.clientWidth) ||
      (typeof document !== 'undefined'
       && document.body
       && document.body.clientWidth) ||
      1;

var agent = (typeof navigator !== 'undefined' && navigator.userAgent) || "";

if (nodeCrypto ||
    (typeof window !== "undefined" &&
     window.crypto && window.crypto.getRandomValues))
  Random = new RandomGenerator();
else
  Random = new RandomGenerator([new Date(), height, width, agent, Math.random()]);

Random.createWithSeeds = function () {
  if (arguments.length === 0) {
    throw new Error('No seeds were provided');
  }
  return new RandomGenerator(arguments);
};
  Meteor.Random = Random;
};

},{}],14:[function(require,module,exports){
module.exports = function(Meteor) {
	var _ = Meteor.underscore;
	var Tracker = Meteor.Tracker;
	var ReactiveObjectMap;

	ReactiveObjectMap = function() {
		if (!(this instanceof ReactiveObjectMap))
		// called without `new`
			return new ReactiveObjectMap();

		this._map = {};
		this._dep = new Tracker.Dependency;
	};

	ReactiveObjectMap.prototype.assign = function(collection, iteratee) {
		this._map = _.indexBy(collection, iteratee);
		this._dep.changed();
	};

	ReactiveObjectMap.prototype.get = function(key) {
		if (Tracker.active)
			this._dep.depend();
		return this._map[key];
	};

	ReactiveObjectMap.prototype.set = function(key, value) {
		var old = this._map[key];
		this._map[key] = value;
		if (old !== value)
			this._dep.changed();
	};

	ReactiveObjectMap.prototype.has = function(key) {
		if (Tracker.active)
			this._dep.depend();
		return this.hasOwnProperty(key);
	};

	ReactiveObjectMap.prototype.clear = function(key, value) {
		this._map = {};
		this._dep.changed();
	};

	ReactiveObjectMap.prototype.delete = function(key, value) {
		if (delete this._map[key])
			this._dep.changed();
	};


	ReactiveObjectMap.prototype.setAttribute = function(key, attr, value) {
		var old = this._map[key][attr];
		this._map[key][attr] = value;
		if (old !== value)
			this._dep.changed();
	};

	ReactiveObjectMap.prototype.getAttribute = function(key, attr) {
		if (Tracker.active)
			this._dep.depend();
		return this._map[key][attr];
	};

	ReactiveObjectMap.prototype.keys = function() {
		if (Tracker.active)
			this._dep.depend();
		return Object.keys(this._map);
	};

	ReactiveObjectMap.prototype.values = function() {
		if (Tracker.active)
			this._dep.depend();
		return _.values(this._map);
	};

	ReactiveObjectMap.prototype.filter = function(predicate) {
		if (Tracker.active)
			this._dep.depend();
		return _.filter(this._map,predicate);
	};

	ReactiveObjectMap.prototype.sortBy = function(iteratee) {
		if (Tracker.active)
			this._dep.depend();
		return _.sortBy(this._map,iteratee);
	};

	ReactiveObjectMap.prototype.map = function(iteratee) {
		if (Tracker.active)
			this._dep.depend();
		return _.map(this._map,iteratee);
	};

	ReactiveObjectMap.prototype.size = function() {
		if (Tracker.active)
			this._dep.depend();
		return Object.keys(this._map).length;
	};

	ReactiveObjectMap.prototype.toString = function() {
		return 'ReactiveObjectMap{' + this.get() + '}';
	};

	ReactiveObjectMap.prototype._numListeners = function() {
		// Tests want to know.
		// Accesses a private field of Tracker.Dependency.
		var count = 0;
		for (var id in this._dep._dependentsById)
			count++;
		return count;
	};

	Meteor.ReactiveObjectMap = ReactiveObjectMap;

	module.exports = ReactiveObjectMap;
};

},{}],15:[function(require,module,exports){
module.exports = function(Meteor) {
var Tracker = Meteor.Tracker;
var ReactiveVar;
/*
 * ## [new] ReactiveVar(initialValue, [equalsFunc])
 *
 * A ReactiveVar holds a single value that can be get and set,
 * such that calling `set` will invalidate any Computations that
 * called `get`, according to the usual contract for reactive
 * data sources.
 *
 * A ReactiveVar is much like a Session variable -- compare `foo.get()`
 * to `Session.get("foo")` -- but it doesn't have a global name and isn't
 * automatically migrated across hot code pushes.  Also, while Session
 * variables can only hold JSON or EJSON, ReactiveVars can hold any value.
 *
 * An important property of ReactiveVars, which is sometimes the reason
 * to use one, is that setting the value to the same value as before has
 * no effect, meaning ReactiveVars can be used to absorb extra
 * invalidations that wouldn't serve a purpose.  However, by default,
 * ReactiveVars are extremely conservative about what changes they
 * absorb.  Calling `set` with an object argument will *always* trigger
 * invalidations, because even if the new value is `===` the old value,
 * the object may have been mutated.  You can change the default behavior
 * by passing a function of two arguments, `oldValue` and `newValue`,
 * to the constructor as `equalsFunc`.
 *
 * This class is extremely basic right now, but the idea is to evolve
 * it into the ReactiveVar of Geoff's Lickable Forms proposal.
 */

/**
 * @class 
 * @instanceName reactiveVar
 * @summary Constructor for a ReactiveVar, which represents a single reactive variable.
 * @locus Client
 * @param {Any} initialValue The initial value to set.  `equalsFunc` is ignored when setting the initial value.
 * @param {Function} [equalsFunc] Optional.  A function of two arguments, called on the old value and the new value whenever the ReactiveVar is set.  If it returns true, no set is performed.  If omitted, the default `equalsFunc` returns true if its arguments are `===` and are of type number, boolean, string, undefined, or null.
 */
ReactiveVar = function (initialValue, equalsFunc) {
  if (! (this instanceof ReactiveVar))
    // called without `new`
    return new ReactiveVar(initialValue, equalsFunc);

  this.curValue = initialValue;
  this.equalsFunc = equalsFunc;
  this.dep = new Tracker.Dependency;
};

ReactiveVar._isEqual = function (oldValue, newValue) {
  var a = oldValue, b = newValue;
  // Two values are "equal" here if they are `===` and are
  // number, boolean, string, undefined, or null.
  if (a !== b)
    return false;
  else
    return ((!a) || (typeof a === 'number') || (typeof a === 'boolean') ||
            (typeof a === 'string'));
};

/**
 * @summary Returns the current value of the ReactiveVar, establishing a reactive dependency.
 * @locus Client
 */
ReactiveVar.prototype.get = function () {
  if (Tracker.active)
    this.dep.depend();

  return this.curValue;
};

/**
 * @summary Sets the current value of the ReactiveVar, invalidating the Computations that called `get` if `newValue` is different from the old value.
 * @locus Client
 * @param {Any} newValue
 */
ReactiveVar.prototype.set = function (newValue) {
  var oldValue = this.curValue;

  if ((this.equalsFunc || ReactiveVar._isEqual)(oldValue, newValue))
    // value is same as last time
    return;

  this.curValue = newValue;
  this.dep.changed();
};

ReactiveVar.prototype.toString = function () {
  return 'ReactiveVar{' + this.get() + '}';
};

ReactiveVar.prototype._numListeners = function() {
  // Tests want to know.
  // Accesses a private field of Tracker.Dependency.
  var count = 0;
  for (var id in this.dep._dependentsById)
    count++;
  return count;
};
  Meteor.ReactiveVar = ReactiveVar;
};

},{}],16:[function(require,module,exports){
module.exports = function(Meteor) {
  var _ = Meteor.underscore;
  var HTML = Meteor.HTML;
  var HTMLTools = Meteor.HTMLTools;
  var BlazeTools = Meteor.BlazeTools;

  var Package = {};
  var SpacebarsCompiler;
  var TemplateTag;

SpacebarsCompiler = {};

// A TemplateTag is the result of parsing a single `{{...}}` tag.
//
// The `.type` of a TemplateTag is one of:
//
// - `"DOUBLE"` - `{{foo}}`
// - `"TRIPLE"` - `{{{foo}}}`
// - `"COMMENT"` - `{{! foo}}`
// - `"BLOCKCOMMENT" - `{{!-- foo--}}`
// - `"INCLUSION"` - `{{> foo}}`
// - `"BLOCKOPEN"` - `{{#foo}}`
// - `"BLOCKCLOSE"` - `{{/foo}}`
// - `"ELSE"` - `{{else}}`
// - `"ESCAPE"` - `{{|`, `{{{|`, `{{{{|` and so on
//
// Besides `type`, the mandatory properties of a TemplateTag are:
//
// - `path` - An array of one or more strings.  The path of `{{foo.bar}}`
//   is `["foo", "bar"]`.  Applies to DOUBLE, TRIPLE, INCLUSION, BLOCKOPEN,
//   and BLOCKCLOSE.
//
// - `args` - An array of zero or more argument specs.  An argument spec
//   is a two or three element array, consisting of a type, value, and
//   optional keyword name.  For example, the `args` of `{{foo "bar" x=3}}`
//   are `[["STRING", "bar"], ["NUMBER", 3, "x"]]`.  Applies to DOUBLE,
//   TRIPLE, INCLUSION, and BLOCKOPEN.
//
// - `value` - A string of the comment's text. Applies to COMMENT and
//   BLOCKCOMMENT.
//
// These additional are typically set during parsing:
//
// - `position` - The HTMLTools.TEMPLATE_TAG_POSITION specifying at what sort
//   of site the TemplateTag was encountered (e.g. at element level or as
//   part of an attribute value). Its absence implies
//   TEMPLATE_TAG_POSITION.ELEMENT.
//
// - `content` and `elseContent` - When a BLOCKOPEN tag's contents are
//   parsed, they are put here.  `elseContent` will only be present if
//   an `{{else}}` was found.

var TEMPLATE_TAG_POSITION = HTMLTools.TEMPLATE_TAG_POSITION;

TemplateTag = SpacebarsCompiler.TemplateTag = function () {
  HTMLTools.TemplateTag.apply(this, arguments);
};
TemplateTag.prototype = new HTMLTools.TemplateTag;
TemplateTag.prototype.constructorName = 'SpacebarsCompiler.TemplateTag';

var makeStacheTagStartRegex = function (r) {
  return new RegExp(r.source + /(?![{>!#/])/.source,
                    r.ignoreCase ? 'i' : '');
};

// "starts" regexes are used to see what type of template
// tag the parser is looking at.  They must match a non-empty
// result, but not the interesting part of the tag.
var starts = {
  ESCAPE: /^\{\{(?=\{*\|)/,
  ELSE: makeStacheTagStartRegex(/^\{\{\s*else(?=[\s}])/i),
  DOUBLE: makeStacheTagStartRegex(/^\{\{\s*(?!\s)/),
  TRIPLE: makeStacheTagStartRegex(/^\{\{\{\s*(?!\s)/),
  BLOCKCOMMENT: makeStacheTagStartRegex(/^\{\{\s*!--/),
  COMMENT: makeStacheTagStartRegex(/^\{\{\s*!/),
  INCLUSION: makeStacheTagStartRegex(/^\{\{\s*>\s*(?!\s)/),
  BLOCKOPEN: makeStacheTagStartRegex(/^\{\{\s*#\s*(?!\s)/),
  BLOCKCLOSE: makeStacheTagStartRegex(/^\{\{\s*\/\s*(?!\s)/)
};

var ends = {
  DOUBLE: /^\s*\}\}/,
  TRIPLE: /^\s*\}\}\}/
};

// Parse a tag from the provided scanner or string.  If the input
// doesn't start with `{{`, returns null.  Otherwise, either succeeds
// and returns a SpacebarsCompiler.TemplateTag, or throws an error (using
// `scanner.fatal` if a scanner is provided).
TemplateTag.parse = function (scannerOrString) {
  var scanner = scannerOrString;
  if (typeof scanner === 'string')
    scanner = new HTMLTools.Scanner(scannerOrString);

  if (! (scanner.peek() === '{' &&
         (scanner.rest()).slice(0, 2) === '{{'))
    return null;

  var run = function (regex) {
    // regex is assumed to start with `^`
    var result = regex.exec(scanner.rest());
    if (! result)
      return null;
    var ret = result[0];
    scanner.pos += ret.length;
    return ret;
  };

  var advance = function (amount) {
    scanner.pos += amount;
  };

  var scanIdentifier = function (isFirstInPath) {
    var id = BlazeTools.parseIdentifierName(scanner);
    if (! id)
      expected('IDENTIFIER');
    if (isFirstInPath &&
        (id === 'null' || id === 'true' || id === 'false'))
      scanner.fatal("Can't use null, true, or false, as an identifier at start of path");

    return id;
  };

  var scanPath = function () {
    var segments = [];

    // handle initial `.`, `..`, `./`, `../`, `../..`, `../../`, etc
    var dots;
    if ((dots = run(/^[\.\/]+/))) {
      var ancestorStr = '.'; // eg `../../..` maps to `....`
      var endsWithSlash = /\/$/.test(dots);

      if (endsWithSlash)
        dots = dots.slice(0, -1);

      _.each(dots.split('/'), function(dotClause, index) {
        if (index === 0) {
          if (dotClause !== '.' && dotClause !== '..')
            expected("`.`, `..`, `./` or `../`");
        } else {
          if (dotClause !== '..')
            expected("`..` or `../`");
        }

        if (dotClause === '..')
          ancestorStr += '.';
      });

      segments.push(ancestorStr);

      if (!endsWithSlash)
        return segments;
    }

    while (true) {
      // scan a path segment

      if (run(/^\[/)) {
        var seg = run(/^[\s\S]*?\]/);
        if (! seg)
          error("Unterminated path segment");
        seg = seg.slice(0, -1);
        if (! seg && ! segments.length)
          error("Path can't start with empty string");
        segments.push(seg);
      } else {
        var id = scanIdentifier(! segments.length);
        if (id === 'this') {
          if (! segments.length) {
            // initial `this`
            segments.push('.');
          } else {
            error("Can only use `this` at the beginning of a path.\nInstead of `foo.this` or `../this`, just write `foo` or `..`.");
          }
        } else {
          segments.push(id);
        }
      }

      var sep = run(/^[\.\/]/);
      if (! sep)
        break;
    }

    return segments;
  };

  // scan the keyword portion of a keyword argument
  // (the "foo" portion in "foo=bar").
  // Result is either the keyword matched, or null
  // if we're not at a keyword argument position.
  var scanArgKeyword = function () {
    var match = /^([^\{\}\(\)\>#=\s"'\[\]]+)\s*=\s*/.exec(scanner.rest());
    if (match) {
      scanner.pos += match[0].length;
      return match[1];
    } else {
      return null;
    }
  };

  // scan an argument; succeeds or errors.
  // Result is an array of two or three items:
  // type , value, and (indicating a keyword argument)
  // keyword name.
  var scanArg = function () {
    var keyword = scanArgKeyword(); // null if not parsing a kwarg
    var value = scanArgValue();
    return keyword ? value.concat(keyword) : value;
  };

  // scan an argument value (for keyword or positional arguments);
  // succeeds or errors.  Result is an array of type, value.
  var scanArgValue = function () {
    var startPos = scanner.pos;
    var result;
    if ((result = BlazeTools.parseNumber(scanner))) {
      return ['NUMBER', result.value];
    } else if ((result = BlazeTools.parseStringLiteral(scanner))) {
      return ['STRING', result.value];
    } else if (/^[\.\[]/.test(scanner.peek())) {
      return ['PATH', scanPath()];
    } else if ((result = BlazeTools.parseIdentifierName(scanner))) {
      var id = result;
      if (id === 'null') {
        return ['NULL', null];
      } else if (id === 'true' || id === 'false') {
        return ['BOOLEAN', id === 'true'];
      } else {
        scanner.pos = startPos; // unconsume `id`
        return ['PATH', scanPath()];
      }
    } else {
      expected('identifier, number, string, boolean, or null');
    }
  };

  var type;

  var error = function (msg) {
    scanner.fatal(msg);
  };

  var expected = function (what) {
    error('Expected ' + what);
  };

  // must do ESCAPE first, immediately followed by ELSE
  // order of others doesn't matter
  if (run(starts.ESCAPE)) type = 'ESCAPE';
  else if (run(starts.ELSE)) type = 'ELSE';
  else if (run(starts.DOUBLE)) type = 'DOUBLE';
  else if (run(starts.TRIPLE)) type = 'TRIPLE';
  else if (run(starts.BLOCKCOMMENT)) type = 'BLOCKCOMMENT';
  else if (run(starts.COMMENT)) type = 'COMMENT';
  else if (run(starts.INCLUSION)) type = 'INCLUSION';
  else if (run(starts.BLOCKOPEN)) type = 'BLOCKOPEN';
  else if (run(starts.BLOCKCLOSE)) type = 'BLOCKCLOSE';
  else
    error('Unknown stache tag');

  var tag = new TemplateTag;
  tag.type = type;

  if (type === 'BLOCKCOMMENT') {
    var result = run(/^[\s\S]*?--\s*?\}\}/);
    if (! result)
      error("Unclosed block comment");
    tag.value = result.slice(0, result.lastIndexOf('--'));
  } else if (type === 'COMMENT') {
    var result = run(/^[\s\S]*?\}\}/);
    if (! result)
      error("Unclosed comment");
    tag.value = result.slice(0, -2);
  } else if (type === 'BLOCKCLOSE') {
    tag.path = scanPath();
    if (! run(ends.DOUBLE))
      expected('`}}`');
  } else if (type === 'ELSE') {
    if (! run(ends.DOUBLE))
      expected('`}}`');
  } else if (type === 'ESCAPE') {
    var result = run(/^\{*\|/);
    tag.value = '{{' + result.slice(0, -1);
  } else {
    // DOUBLE, TRIPLE, BLOCKOPEN, INCLUSION
    tag.path = scanPath();
    tag.args = [];
    var foundKwArg = false;
    while (true) {
      run(/^\s*/);
      if (type === 'TRIPLE') {
        if (run(ends.TRIPLE))
          break;
        else if (scanner.peek() === '}')
          expected('`}}}`');
      } else {
        if (run(ends.DOUBLE))
          break;
        else if (scanner.peek() === '}')
          expected('`}}`');
      }
      var newArg = scanArg();
      if (newArg.length === 3) {
        foundKwArg = true;
      } else {
        if (foundKwArg)
          error("Can't have a non-keyword argument after a keyword argument");
      }
      tag.args.push(newArg);

      if (run(/^(?=[\s}])/) !== '')
        expected('space');
    }
  }

  return tag;
};

// Returns a SpacebarsCompiler.TemplateTag parsed from `scanner`, leaving scanner
// at its original position.
//
// An error will still be thrown if there is not a valid template tag at
// the current position.
TemplateTag.peek = function (scanner) {
  var startPos = scanner.pos;
  var result = TemplateTag.parse(scanner);
  scanner.pos = startPos;
  return result;
};

// Like `TemplateTag.parse`, but in the case of blocks, parse the complete
// `{{#foo}}...{{/foo}}` with `content` and possible `elseContent`, rather
// than just the BLOCKOPEN tag.
//
// In addition:
//
// - Throws an error if `{{else}}` or `{{/foo}}` tag is encountered.
//
// - Returns `null` for a COMMENT.  (This case is distinguishable from
//   parsing no tag by the fact that the scanner is advanced.)
//
// - Takes an HTMLTools.TEMPLATE_TAG_POSITION `position` and sets it as the
//   TemplateTag's `.position` property.
//
// - Validates the tag's well-formedness and legality at in its position.
TemplateTag.parseCompleteTag = function (scannerOrString, position) {
  var scanner = scannerOrString;
  if (typeof scanner === 'string')
    scanner = new HTMLTools.Scanner(scannerOrString);

  var startPos = scanner.pos; // for error messages
  var result = TemplateTag.parse(scannerOrString);
  if (! result)
    return result;

  if (result.type === 'BLOCKCOMMENT')
    return null;

  if (result.type === 'COMMENT')
    return null;

  if (result.type === 'ELSE')
    scanner.fatal("Unexpected {{else}}");

  if (result.type === 'BLOCKCLOSE')
    scanner.fatal("Unexpected closing template tag");

  position = (position || TEMPLATE_TAG_POSITION.ELEMENT);
  if (position !== TEMPLATE_TAG_POSITION.ELEMENT)
    result.position = position;

  if (result.type === 'BLOCKOPEN') {
    // parse block contents

    // Construct a string version of `.path` for comparing start and
    // end tags.  For example, `foo/[0]` was parsed into `["foo", "0"]`
    // and now becomes `foo,0`.  This form may also show up in error
    // messages.
    var blockName = result.path.join(',');

    var textMode = null;
      if (blockName === 'markdown' ||
          position === TEMPLATE_TAG_POSITION.IN_RAWTEXT) {
        textMode = HTML.TEXTMODE.STRING;
      } else if (position === TEMPLATE_TAG_POSITION.IN_RCDATA ||
                 position === TEMPLATE_TAG_POSITION.IN_ATTRIBUTE) {
        textMode = HTML.TEXTMODE.RCDATA;
      }
      var parserOptions = {
        getTemplateTag: TemplateTag.parseCompleteTag,
        shouldStop: isAtBlockCloseOrElse,
        textMode: textMode
      };
    result.content = HTMLTools.parseFragment(scanner, parserOptions);

    if (scanner.rest().slice(0, 2) !== '{{')
      scanner.fatal("Expected {{else}} or block close for " + blockName);

    var lastPos = scanner.pos; // save for error messages
    var tmplTag = TemplateTag.parse(scanner); // {{else}} or {{/foo}}

    if (tmplTag.type === 'ELSE') {
      // parse {{else}} and content up to close tag
      result.elseContent = HTMLTools.parseFragment(scanner, parserOptions);

      if (scanner.rest().slice(0, 2) !== '{{')
        scanner.fatal("Expected block close for " + blockName);

      lastPos = scanner.pos;
      tmplTag = TemplateTag.parse(scanner);
    }

    if (tmplTag.type === 'BLOCKCLOSE') {
      var blockName2 = tmplTag.path.join(',');
      if (blockName !== blockName2) {
        scanner.pos = lastPos;
        scanner.fatal('Expected tag to close ' + blockName + ', found ' +
                      blockName2);
      }
    } else {
      scanner.pos = lastPos;
      scanner.fatal('Expected tag to close ' + blockName + ', found ' +
                    tmplTag.type);
    }
  }

  var finalPos = scanner.pos;
  scanner.pos = startPos;
  validateTag(result, scanner);
  scanner.pos = finalPos;

  return result;
};

var isAtBlockCloseOrElse = function (scanner) {
  // Detect `{{else}}` or `{{/foo}}`.
  //
  // We do as much work ourselves before deferring to `TemplateTag.peek`,
  // for efficiency (we're called for every input token) and to be
  // less obtrusive, because `TemplateTag.peek` will throw an error if it
  // sees `{{` followed by a malformed tag.
  var rest, type;
  return (scanner.peek() === '{' &&
          (rest = scanner.rest()).slice(0, 2) === '{{' &&
          /^\{\{\s*(\/|else\b)/.test(rest) &&
          (type = TemplateTag.peek(scanner).type) &&
          (type === 'BLOCKCLOSE' || type === 'ELSE'));
};

// Validate that `templateTag` is correctly formed and legal for its
// HTML position.  Use `scanner` to report errors. On success, does
// nothing.
var validateTag = function (ttag, scanner) {

  if (ttag.type === 'INCLUSION' || ttag.type === 'BLOCKOPEN') {
    var args = ttag.args;
    if (args.length > 1 && args[0].length === 2 && args[0][0] !== 'PATH') {
      // we have a positional argument that is not a PATH followed by
      // other arguments
      scanner.fatal("First argument must be a function, to be called on the rest of the arguments; found " + args[0][0]);
    }
  }

  var position = ttag.position || TEMPLATE_TAG_POSITION.ELEMENT;
  if (position === TEMPLATE_TAG_POSITION.IN_ATTRIBUTE) {
    if (ttag.type === 'DOUBLE' || ttag.type === 'ESCAPE') {
      return;
    } else if (ttag.type === 'BLOCKOPEN') {
      var path = ttag.path;
      var path0 = path[0];
      if (! (path.length === 1 && (path0 === 'if' ||
                                   path0 === 'unless' ||
                                   path0 === 'with' ||
                                   path0 === 'each'))) {
        scanner.fatal("Custom block helpers are not allowed in an HTML attribute, only built-in ones like #each and #if");
      }
    } else {
      scanner.fatal(ttag.type + " template tag is not allowed in an HTML attribute");
    }
  } else if (position === TEMPLATE_TAG_POSITION.IN_START_TAG) {
    if (! (ttag.type === 'DOUBLE')) {
      scanner.fatal("Reactive HTML attributes must either have a constant name or consist of a single {{helper}} providing a dictionary of names and values.  A template tag of type " + ttag.type + " is not allowed here.");
    }
    if (scanner.peek() === '=') {
      scanner.fatal("Template tags are not allowed in attribute names, only in attribute values or in the form of a single {{helper}} that evaluates to a dictionary of name=value pairs.");
    }
  }

};
// Optimize parts of an HTMLjs tree into raw HTML strings when they don't
// contain template tags.

var constant = function (value) {
  return function () { return value; };
};

var OPTIMIZABLE = {
  NONE: 0,
  PARTS: 1,
  FULL: 2
};

// We can only turn content into an HTML string if it contains no template
// tags and no "tricky" HTML tags.  If we can optimize the entire content
// into a string, we return OPTIMIZABLE.FULL.  If the we are given an
// unoptimizable node, we return OPTIMIZABLE.NONE.  If we are given a tree
// that contains an unoptimizable node somewhere, we return OPTIMIZABLE.PARTS.
//
// For example, we always create SVG elements programmatically, since SVG
// doesn't have innerHTML.  If we are given an SVG element, we return NONE.
// However, if we are given a big tree that contains SVG somewhere, we
// return PARTS so that the optimizer can descend into the tree and optimize
// other parts of it.
var CanOptimizeVisitor = HTML.Visitor.extend();
CanOptimizeVisitor.def({
  visitNull: constant(OPTIMIZABLE.FULL),
  visitPrimitive: constant(OPTIMIZABLE.FULL),
  visitComment: constant(OPTIMIZABLE.FULL),
  visitCharRef: constant(OPTIMIZABLE.FULL),
  visitRaw: constant(OPTIMIZABLE.FULL),
  visitObject: constant(OPTIMIZABLE.NONE),
  visitFunction: constant(OPTIMIZABLE.NONE),
  visitArray: function (x) {
    for (var i = 0; i < x.length; i++)
      if (this.visit(x[i]) !== OPTIMIZABLE.FULL)
        return OPTIMIZABLE.PARTS;
    return OPTIMIZABLE.FULL;
  },
  visitTag: function (tag) {
    var tagName = tag.tagName;
    if (tagName === 'textarea') {
      // optimizing into a TEXTAREA's RCDATA would require being a little
      // more clever.
      return OPTIMIZABLE.NONE;
    } else if (! (HTML.isKnownElement(tagName) &&
                  ! HTML.isKnownSVGElement(tagName))) {
      // foreign elements like SVG can't be stringified for innerHTML.
      return OPTIMIZABLE.NONE;
    } else if (tagName === 'table') {
      // Avoid ever producing HTML containing `<table><tr>...`, because the
      // browser will insert a TBODY.  If we just `createElement("table")` and
      // `createElement("tr")`, on the other hand, no TBODY is necessary
      // (assuming IE 8+).
      return OPTIMIZABLE.NONE;
    }

    var children = tag.children;
    for (var i = 0; i < children.length; i++)
      if (this.visit(children[i]) !== OPTIMIZABLE.FULL)
        return OPTIMIZABLE.PARTS;

    if (this.visitAttributes(tag.attrs) !== OPTIMIZABLE.FULL)
      return OPTIMIZABLE.PARTS;

    return OPTIMIZABLE.FULL;
  },
  visitAttributes: function (attrs) {
    if (attrs) {
      var isArray = HTML.isArray(attrs);
      for (var i = 0; i < (isArray ? attrs.length : 1); i++) {
        var a = (isArray ? attrs[i] : attrs);
        if ((typeof a !== 'object') || (a instanceof HTMLTools.TemplateTag))
          return OPTIMIZABLE.PARTS;
        for (var k in a)
          if (this.visit(a[k]) !== OPTIMIZABLE.FULL)
            return OPTIMIZABLE.PARTS;
      }
    }
    return OPTIMIZABLE.FULL;
  }
});

var getOptimizability = function (content) {
  return (new CanOptimizeVisitor).visit(content);
};

var toRaw = function (x) {
  return HTML.Raw(HTML.toHTML(x));
};

var TreeTransformer = HTML.TransformingVisitor.extend();
TreeTransformer.def({
  visitAttributes: function (attrs/*, ...*/) {
    // pass template tags through by default
    if (attrs instanceof HTMLTools.TemplateTag)
      return attrs;

    return HTML.TransformingVisitor.prototype.visitAttributes.apply(
      this, arguments);
  }
});

// Replace parts of the HTMLjs tree that have no template tags (or
// tricky HTML tags) with HTML.Raw objects containing raw HTML.
var OptimizingVisitor = TreeTransformer.extend();
OptimizingVisitor.def({
  visitNull: toRaw,
  visitPrimitive: toRaw,
  visitComment: toRaw,
  visitCharRef: toRaw,
  visitArray: function (array) {
    var optimizability = getOptimizability(array);
    if (optimizability === OPTIMIZABLE.FULL) {
      return toRaw(array);
    } else if (optimizability === OPTIMIZABLE.PARTS) {
      return TreeTransformer.prototype.visitArray.call(this, array);
    } else {
      return array;
    }
  },
  visitTag: function (tag) {
    var optimizability = getOptimizability(tag);
    if (optimizability === OPTIMIZABLE.FULL) {
      return toRaw(tag);
    } else if (optimizability === OPTIMIZABLE.PARTS) {
      return TreeTransformer.prototype.visitTag.call(this, tag);
    } else {
      return tag;
    }
  },
  visitChildren: function (children) {
    // don't optimize the children array into a Raw object!
    return TreeTransformer.prototype.visitArray.call(this, children);
  },
  visitAttributes: function (attrs) {
    return attrs;
  }
});

// Combine consecutive HTML.Raws.  Remove empty ones.
var RawCompactingVisitor = TreeTransformer.extend();
RawCompactingVisitor.def({
  visitArray: function (array) {
    var result = [];
    for (var i = 0; i < array.length; i++) {
      var item = array[i];
      if ((item instanceof HTML.Raw) &&
          ((! item.value) ||
           (result.length &&
            (result[result.length - 1] instanceof HTML.Raw)))) {
        // two cases: item is an empty Raw, or previous item is
        // a Raw as well.  In the latter case, replace the previous
        // Raw with a longer one that includes the new Raw.
        if (item.value) {
          result[result.length - 1] = HTML.Raw(
            result[result.length - 1].value + item.value);
        }
      } else {
        result.push(item);
      }
    }
    return result;
  }
});

// Replace pointless Raws like `HTMl.Raw('foo')` that contain no special
// characters with simple strings.
var RawReplacingVisitor = TreeTransformer.extend();
RawReplacingVisitor.def({
  visitRaw: function (raw) {
    var html = raw.value;
    if (html.indexOf('&') < 0 && html.indexOf('<') < 0) {
      return html;
    } else {
      return raw;
    }
  }
});

SpacebarsCompiler.optimize = function (tree) {
  //tree = (new OptimizingVisitor).visit(tree);
  tree = (new RawCompactingVisitor).visit(tree);
  tree = (new RawReplacingVisitor).visit(tree);
  return tree;
};
// ============================================================
// Code-generation of template tags

// The `CodeGen` class currently has no instance state, but in theory
// it could be useful to track per-function state, like whether we
// need to emit `var self = this` or not.
var CodeGen = SpacebarsCompiler.CodeGen = function () {};

var builtInBlockHelpers = SpacebarsCompiler._builtInBlockHelpers = {
  'if': 'Blaze.If',
  'unless': 'Blaze.Unless',
  'with': 'Spacebars.With',
  'each': 'Blaze.Each'
};


// Mapping of "macros" which, when preceded by `Template.`, expand
// to special code rather than following the lookup rules for dotted
// symbols.
var builtInTemplateMacros = {
  // `view` is a local variable defined in the generated render
  // function for the template in which `Template.contentBlock` or
  // `Template.elseBlock` is invoked.
  'contentBlock': 'view.templateContentBlock',
  'elseBlock': 'view.templateElseBlock',

  // Confusingly, this makes `{{> Template.dynamic}}` an alias
  // for `{{> __dynamic}}`, where "__dynamic" is the template that
  // implements the dynamic template feature.
  'dynamic': 'Template.__dynamic',

  'subscriptionsReady': 'view.templateInstance().subscriptionsReady()'
};

// A "reserved name" can't be used as a <template> name.  This
// function is used by the template file scanner.
//
// Note that the runtime imposes additional restrictions, for example
// banning the name "body" and names of built-in object properties
// like "toString".
SpacebarsCompiler.isReservedName = function (name) {
  return builtInBlockHelpers.hasOwnProperty(name) ||
    builtInTemplateMacros.hasOwnProperty(name);
};

var makeObjectLiteral = function (obj) {
  var parts = [];
  for (var k in obj)
    parts.push(BlazeTools.toObjectLiteralKey(k) + ': ' + obj[k]);
  return '{' + parts.join(', ') + '}';
};

_.extend(CodeGen.prototype, {
  codeGenTemplateTag: function (tag) {
    var self = this;
    if (tag.position === HTMLTools.TEMPLATE_TAG_POSITION.IN_START_TAG) {
      // Special dynamic attributes: `<div {{attrs}}>...`
      // only `tag.type === 'DOUBLE'` allowed (by earlier validation)
      return BlazeTools.EmitCode('function () { return ' +
          self.codeGenMustache(tag.path, tag.args, 'attrMustache')
          + '; }');
    } else {
      if (tag.type === 'DOUBLE' || tag.type === 'TRIPLE') {
        var code = self.codeGenMustache(tag.path, tag.args);
        if (tag.type === 'TRIPLE') {
          code = 'Spacebars.makeRaw(' + code + ')';
        }
        if (tag.position !== HTMLTools.TEMPLATE_TAG_POSITION.IN_ATTRIBUTE) {
          // Reactive attributes are already wrapped in a function,
          // and there's no fine-grained reactivity.
          // Anywhere else, we need to create a View.
          code = 'Blaze.View("lookup:' + tag.path.join('.') + '", ' +
            'function () { return ' + code + '; })';
        }
        return BlazeTools.EmitCode(code);
      } else if (tag.type === 'INCLUSION' || tag.type === 'BLOCKOPEN') {
        var path = tag.path;

        if (tag.type === 'BLOCKOPEN' &&
            builtInBlockHelpers.hasOwnProperty(path[0])) {
          // if, unless, with, each.
          //
          // If someone tries to do `{{> if}}`, we don't
          // get here, but an error is thrown when we try to codegen the path.

          // Note: If we caught these errors earlier, while scanning, we'd be able to
          // provide nice line numbers.
          if (path.length > 1)
            throw new Error("Unexpected dotted path beginning with " + path[0]);
          if (! tag.args.length)
            throw new Error("#" + path[0] + " requires an argument");

          // `args` must exist (tag.args.length > 0)
          var dataCode = self.codeGenInclusionDataFunc(tag.args) || 'null';
          // `content` must exist
          var contentBlock = (('content' in tag) ?
                              self.codeGenBlock(tag.content) : null);
          // `elseContent` may not exist
          var elseContentBlock = (('elseContent' in tag) ?
                                  self.codeGenBlock(tag.elseContent) : null);

          var callArgs = [dataCode, contentBlock];
          if (elseContentBlock)
            callArgs.push(elseContentBlock);

          return BlazeTools.EmitCode(
            builtInBlockHelpers[path[0]] + '(' + callArgs.join(', ') + ')');

        } else {
          var compCode = self.codeGenPath(path, {lookupTemplate: true});
          if (path.length > 1) {
            // capture reactivity
            compCode = 'function () { return Spacebars.call(' + compCode +
              '); }';
          }

          var dataCode = self.codeGenInclusionDataFunc(tag.args);
          var content = (('content' in tag) ?
                         self.codeGenBlock(tag.content) : null);
          var elseContent = (('elseContent' in tag) ?
                             self.codeGenBlock(tag.elseContent) : null);

          var includeArgs = [compCode];
          if (content) {
            includeArgs.push(content);
            if (elseContent)
              includeArgs.push(elseContent);
          }

          var includeCode =
                'Spacebars.include(' + includeArgs.join(', ') + ')';

          // calling convention compat -- set the data context around the
          // entire inclusion, so that if the name of the inclusion is
          // a helper function, it gets the data context in `this`.
          // This makes for a pretty confusing calling convention --
          // In `{{#foo bar}}`, `foo` is evaluated in the context of `bar`
          // -- but it's what we shipped for 0.8.0.  The rationale is that
          // `{{#foo bar}}` is sugar for `{{#with bar}}{{#foo}}...`.
          if (dataCode) {
            includeCode =
              'Blaze._TemplateWith(' + dataCode + ', function () { return ' +
              includeCode + '; })';
          }

          // XXX BACK COMPAT - UI is the old name, Template is the new
          if ((path[0] === 'UI' || path[0] === 'Template') &&
              (path[1] === 'contentBlock' || path[1] === 'elseBlock')) {
            // Call contentBlock and elseBlock in the appropriate scope
            includeCode = 'Blaze._InOuterTemplateScope(view, function () { return '
              + includeCode + '; })';
          }

          return BlazeTools.EmitCode(includeCode);
        }
      } else if (tag.type === 'ESCAPE') {
        return tag.value;
      } else {
        // Can't get here; TemplateTag validation should catch any
        // inappropriate tag types that might come out of the parser.
        throw new Error("Unexpected template tag type: " + tag.type);
      }
    }
  },

  // `path` is an array of at least one string.
  //
  // If `path.length > 1`, the generated code may be reactive
  // (i.e. it may invalidate the current computation).
  //
  // No code is generated to call the result if it's a function.
  //
  // Options:
  //
  // - lookupTemplate {Boolean} If true, generated code also looks in
  //   the list of templates. (After helpers, before data context).
  //   Used when generating code for `{{> foo}}` or `{{#foo}}`. Only
  //   used for non-dotted paths.
  codeGenPath: function (path, opts) {
    if (builtInBlockHelpers.hasOwnProperty(path[0]))
      throw new Error("Can't use the built-in '" + path[0] + "' here");
    // Let `{{#if Template.contentBlock}}` check whether this template was
    // invoked via inclusion or as a block helper, in addition to supporting
    // `{{> Template.contentBlock}}`.
    // XXX BACK COMPAT - UI is the old name, Template is the new
    if (path.length >= 2 &&
        (path[0] === 'UI' || path[0] === 'Template')
        && builtInTemplateMacros.hasOwnProperty(path[1])) {
      if (path.length > 2)
        throw new Error("Unexpected dotted path beginning with " +
                        path[0] + '.' + path[1]);
      return builtInTemplateMacros[path[1]];
    }

    var firstPathItem = BlazeTools.toJSLiteral(path[0]);
    var lookupMethod = 'lookup';
    if (opts && opts.lookupTemplate && path.length === 1)
      lookupMethod = 'lookupTemplate';
    var code = 'view.' + lookupMethod + '(' + firstPathItem + ')';

    if (path.length > 1) {
      code = 'Spacebars.dot(' + code + ', ' +
        _.map(path.slice(1), BlazeTools.toJSLiteral).join(', ') + ')';
    }

    return code;
  },

  // Generates code for an `[argType, argValue]` argument spec,
  // ignoring the third element (keyword argument name) if present.
  //
  // The resulting code may be reactive (in the case of a PATH of
  // more than one element) and is not wrapped in a closure.
  codeGenArgValue: function (arg) {
    var self = this;

    var argType = arg[0];
    var argValue = arg[1];

    var argCode;
    switch (argType) {
    case 'STRING':
    case 'NUMBER':
    case 'BOOLEAN':
    case 'NULL':
      argCode = BlazeTools.toJSLiteral(argValue);
      break;
    case 'PATH':
      argCode = self.codeGenPath(argValue);
      break;
    default:
      // can't get here
      throw new Error("Unexpected arg type: " + argType);
    }

    return argCode;
  },

  // Generates a call to `Spacebars.fooMustache` on evaluated arguments.
  // The resulting code has no function literals and must be wrapped in
  // one for fine-grained reactivity.
  codeGenMustache: function (path, args, mustacheType) {
    var self = this;

    var nameCode = self.codeGenPath(path);
    var argCode = self.codeGenMustacheArgs(args);
    var mustache = (mustacheType || 'mustache');

    return 'Spacebars.' + mustache + '(' + nameCode +
      (argCode ? ', ' + argCode.join(', ') : '') + ')';
  },

  // returns: array of source strings, or null if no
  // args at all.
  codeGenMustacheArgs: function (tagArgs) {
    var self = this;

    var kwArgs = null; // source -> source
    var args = null; // [source]

    // tagArgs may be null
    _.each(tagArgs, function (arg) {
      var argCode = self.codeGenArgValue(arg);

      if (arg.length > 2) {
        // keyword argument (represented as [type, value, name])
        kwArgs = (kwArgs || {});
        kwArgs[arg[2]] = argCode;
      } else {
        // positional argument
        args = (args || []);
        args.push(argCode);
      }
    });

    // put kwArgs in options dictionary at end of args
    if (kwArgs) {
      args = (args || []);
      args.push('Spacebars.kw(' + makeObjectLiteral(kwArgs) + ')');
    }

    return args;
  },

  codeGenBlock: function (content) {
    return SpacebarsCompiler.codeGen(content);
  },

  codeGenInclusionDataFunc: function (args) {
    var self = this;

    var dataFuncCode = null;

    if (! args.length) {
      // e.g. `{{#foo}}`
      return null;
    } else if (args[0].length === 3) {
      // keyword arguments only, e.g. `{{> point x=1 y=2}}`
      var dataProps = {};
      _.each(args, function (arg) {
        var argKey = arg[2];
        dataProps[argKey] = 'Spacebars.call(' + self.codeGenArgValue(arg) + ')';
      });
      dataFuncCode = makeObjectLiteral(dataProps);
    } else if (args[0][0] !== 'PATH') {
      // literal first argument, e.g. `{{> foo "blah"}}`
      //
      // tag validation has confirmed, in this case, that there is only
      // one argument (`args.length === 1`)
      dataFuncCode = self.codeGenArgValue(args[0]);
    } else if (args.length === 1) {
      // one argument, must be a PATH
      dataFuncCode = 'Spacebars.call(' + self.codeGenPath(args[0][1]) + ')';
    } else {
      // Multiple positional arguments; treat them as a nested
      // "data mustache"
      dataFuncCode = self.codeGenMustache(args[0][1], args.slice(1),
                                          'dataMustache');
    }

    return 'function () { return ' + dataFuncCode + '; }';
  }

});

SpacebarsCompiler.parse = function (input) {

  var tree = HTMLTools.parseFragment(
    input,
    { getTemplateTag: TemplateTag.parseCompleteTag });

  return tree;
};

SpacebarsCompiler.compile = function (input, options) {
  var tree = SpacebarsCompiler.parse(input);
  return SpacebarsCompiler.codeGen(tree, options);
};

SpacebarsCompiler._TemplateTagReplacer = HTML.TransformingVisitor.extend();
SpacebarsCompiler._TemplateTagReplacer.def({
  visitObject: function (x) {
    if (x instanceof HTMLTools.TemplateTag) {

      // Make sure all TemplateTags in attributes have the right
      // `.position` set on them.  This is a bit of a hack
      // (we shouldn't be mutating that here), but it allows
      // cleaner codegen of "synthetic" attributes like TEXTAREA's
      // "value", where the template tags were originally not
      // in an attribute.
      if (this.inAttributeValue)
        x.position = HTMLTools.TEMPLATE_TAG_POSITION.IN_ATTRIBUTE;

      return this.codegen.codeGenTemplateTag(x);
    }

    return HTML.TransformingVisitor.prototype.visitObject.call(this, x);
  },
  visitAttributes: function (attrs) {
    if (attrs instanceof HTMLTools.TemplateTag)
      return this.codegen.codeGenTemplateTag(attrs);

    // call super (e.g. for case where `attrs` is an array)
    return HTML.TransformingVisitor.prototype.visitAttributes.call(this, attrs);
  },
  visitAttribute: function (name, value, tag) {
    this.inAttributeValue = true;
    var result = this.visit(value);
    this.inAttributeValue = false;

    if (result !== value) {
      // some template tags must have been replaced, because otherwise
      // we try to keep things `===` when transforming.  Wrap the code
      // in a function as per the rules.  You can't have
      // `{id: Blaze.View(...)}` as an attributes dict because the View
      // would be rendered more than once; you need to wrap it in a function
      // so that it's a different View each time.
      return BlazeTools.EmitCode(this.codegen.codeGenBlock(result));
    }
    return result;
  }
});

SpacebarsCompiler.codeGen = function (parseTree, options) {
  // is this a template, rather than a block passed to
  // a block helper, say
  var isTemplate = (options && options.isTemplate);
  var isBody = (options && options.isBody);

  var tree = parseTree;

  // The flags `isTemplate` and `isBody` are kind of a hack.
  if (isTemplate || isBody) {
    // optimizing fragments would require being smarter about whether we are
    // in a TEXTAREA, say.
    tree = SpacebarsCompiler.optimize(tree);
  }

  var codegen = new SpacebarsCompiler.CodeGen;
  tree = (new SpacebarsCompiler._TemplateTagReplacer(
    {codegen: codegen})).visit(tree);

  var code = '(function () { ';
  if (isTemplate || isBody) {
    code += 'var view = this; ';
  }
  code += 'return ';
  code += BlazeTools.toJS(tree);
  code += '; })';

  code = SpacebarsCompiler._beautify(code);

  return code;
};

SpacebarsCompiler._beautify = function (code) {
  if (Package.minifiers && Package.minifiers.UglifyJSMinify) {
    var result = UglifyJSMinify(code,
                                { fromString: true,
                                  mangle: false,
                                  compress: false,
                                  output: { beautify: true,
                                            indent_level: 2,
                                            width: 80 } });
    var output = result.code;
    // Uglify interprets our expression as a statement and may add a semicolon.
    // Strip trailing semicolon.
    output = output.replace(/;$/, '');
    return output;
  } else {
    // don't actually beautify; no UglifyJS
    return code;
  }
};
  Meteor.SpacebarsCompiler = SpacebarsCompiler;
};

},{}],17:[function(require,module,exports){
module.exports = function(Meteor) {
var HTML = Meteor.HTML;
var Tracker = Meteor.Tracker;
var Blaze = Meteor.Blaze;
var ObserveSequence = Meteor.ObserveSequence;
var ReactiveVar = Meteor.ReactiveVar;
var Template = Meteor.Template;
Blaze.ReactiveVar = ReactiveVar;
var Spacebars;
var Handlebars = {};
Handlebars.registerHelper = Blaze.registerHelper;

Handlebars._escape = Blaze._escape;

// Return these from {{...}} helpers to achieve the same as returning
// strings from {{{...}}} helpers
Handlebars.SafeString = function(string) {
  this.string = string;
};
Handlebars.SafeString.prototype.toString = function() {
  return this.string.toString();
};

Spacebars = {};

var tripleEquals = function (a, b) { return a === b; };

Spacebars.include = function (templateOrFunction, contentFunc, elseFunc) {
  if (! templateOrFunction)
    return null;

  if (typeof templateOrFunction !== 'function') {
    var template = templateOrFunction;
    if (! Blaze.isTemplate(template))
      throw new Error("Expected template or null, found: " + template);
    return templateOrFunction.constructView(contentFunc, elseFunc);
  }

  var templateVar = Blaze.ReactiveVar(null, tripleEquals);
  var view = Blaze.View('Spacebars.include', function () {
    var template = templateVar.get();
    if (template === null)
      return null;

    if (! Blaze.isTemplate(template))
      throw new Error("Expected template or null, found: " + template);

    return template.constructView(contentFunc, elseFunc);
  });
  view.__templateVar = templateVar;
  view.onViewCreated(function () {
    this.autorun(function () {
      templateVar.set(templateOrFunction());
    });
  });

  return view;
};

// Executes `{{foo bar baz}}` when called on `(foo, bar, baz)`.
// If `bar` and `baz` are functions, they are called before
// `foo` is called on them.
//
// This is the shared part of Spacebars.mustache and
// Spacebars.attrMustache, which differ in how they post-process the
// result.
Spacebars.mustacheImpl = function (value/*, args*/) {
  var args = arguments;
  // if we have any arguments (pos or kw), add an options argument
  // if there isn't one.
  if (args.length > 1) {
    var kw = args[args.length - 1];
    if (! (kw instanceof Spacebars.kw)) {
      kw = Spacebars.kw();
      // clone arguments into an actual array, then push
      // the empty kw object.
      args = Array.prototype.slice.call(arguments);
      args.push(kw);
    } else {
      // For each keyword arg, call it if it's a function
      var newHash = {};
      for (var k in kw.hash) {
        var v = kw.hash[k];
        newHash[k] = (typeof v === 'function' ? v() : v);
      }
      args[args.length - 1] = Spacebars.kw(newHash);
    }
  }

  return Spacebars.call.apply(null, args);
};

Spacebars.mustache = function (value/*, args*/) {
  var result = Spacebars.mustacheImpl.apply(null, arguments);

  if (result instanceof Spacebars.SafeString)
    return HTML.Raw(result.toString());
  else
    // map `null`, `undefined`, and `false` to null, which is important
    // so that attributes with nully values are considered absent.
    // stringify anything else (e.g. strings, booleans, numbers including 0).
    return (result == null || result === false) ? null : String(result);
};

Spacebars.attrMustache = function (value/*, args*/) {
  var result = Spacebars.mustacheImpl.apply(null, arguments);

  if (result == null || result === '') {
    return null;
  } else if (typeof result === 'object') {
    return result;
  } else if (typeof result === 'string' && HTML.isValidAttributeName(result)) {
    var obj = {};
    obj[result] = '';
    return obj;
  } else {
    throw new Error("Expected valid attribute name, '', null, or object");
  }
};

Spacebars.dataMustache = function (value/*, args*/) {
  var result = Spacebars.mustacheImpl.apply(null, arguments);

  return result;
};

// Idempotently wrap in `HTML.Raw`.
//
// Called on the return value from `Spacebars.mustache` in case the
// template uses triple-stache (`{{{foo bar baz}}}`).
Spacebars.makeRaw = function (value) {
  if (value == null) // null or undefined
    return null;
  else if (value instanceof HTML.Raw)
    return value;
  else
    return HTML.Raw(value);
};

// If `value` is a function, called it on the `args`, after
// evaluating the args themselves (by calling them if they are
// functions).  Otherwise, simply return `value` (and assert that
// there are no args).
Spacebars.call = function (value/*, args*/) {
  if (typeof value === 'function') {
    // evaluate arguments if they are functions (by calling them)
    var newArgs = [];
    for (var i = 1; i < arguments.length; i++) {
      var arg = arguments[i];
      newArgs[i-1] = (typeof arg === 'function' ? arg() : arg);
    }

    return value.apply(null, newArgs);
  } else {
    if (arguments.length > 1)
      throw new Error("Can't call non-function: " + value);

    return value;
  }
};

// Call this as `Spacebars.kw({ ... })`.  The return value
// is `instanceof Spacebars.kw`.
Spacebars.kw = function (hash) {
  if (! (this instanceof Spacebars.kw))
    // called without new; call with new
    return new Spacebars.kw(hash);

  this.hash = hash || {};
};

// Call this as `Spacebars.SafeString("some HTML")`.  The return value
// is `instanceof Spacebars.SafeString` (and `instanceof Handlebars.SafeString).
Spacebars.SafeString = function (html) {
  if (! (this instanceof Spacebars.SafeString))
    // called without new; call with new
    return new Spacebars.SafeString(html);

  return new Handlebars.SafeString(html);
};
Spacebars.SafeString.prototype = Handlebars.SafeString.prototype;

// `Spacebars.dot(foo, "bar", "baz")` performs a special kind
// of `foo.bar.baz` that allows safe indexing of `null` and
// indexing of functions (which calls the function).  If the
// result is a function, it is always a bound function (e.g.
// a wrapped version of `baz` that always uses `foo.bar` as
// `this`).
//
// In `Spacebars.dot(foo, "bar")`, `foo` is assumed to be either
// a non-function value or a "fully-bound" function wrapping a value,
// where fully-bound means it takes no arguments and ignores `this`.
//
// `Spacebars.dot(foo, "bar")` performs the following steps:
//
// * If `foo` is falsy, return `foo`.
//
// * If `foo` is a function, call it (set `foo` to `foo()`).
//
// * If `foo` is falsy now, return `foo`.
//
// * Return `foo.bar`, binding it to `foo` if it's a function.
Spacebars.dot = function (value, id1/*, id2, ...*/) {
  if (arguments.length > 2) {
    // Note: doing this recursively is probably less efficient than
    // doing it in an iterative loop.
    var argsForRecurse = [];
    argsForRecurse.push(Spacebars.dot(value, id1));
    argsForRecurse.push.apply(argsForRecurse,
                              Array.prototype.slice.call(arguments, 2));
    return Spacebars.dot.apply(null, argsForRecurse);
  }

  if (typeof value === 'function')
    value = value();

  if (! value)
    return value; // falsy, don't index, pass through

  var result = value[id1];
  if (typeof result !== 'function')
    return result;
  // `value[id1]` (or `value()[id1]`) is a function.
  // Bind it so that when called, `value` will be placed in `this`.
  return function (/*arguments*/) {
    return result.apply(value, arguments);
  };
};

// Spacebars.With implements the conditional logic of rendering
// the `{{else}}` block if the argument is falsy.  It combines
// a Blaze.If with a Blaze.With (the latter only in the truthy
// case, since the else block is evaluated without entering
// a new data context).
Spacebars.With = function (argFunc, contentFunc, elseFunc) {
  var argVar = new Blaze.ReactiveVar;
  var view = Blaze.View('Spacebars_with', function () {
    return Blaze.If(function () { return argVar.get(); },
                    function () { return Blaze.With(function () {
                      return argVar.get(); }, contentFunc); },
                    elseFunc);
  });
  view.onViewCreated(function () {
    this.autorun(function () {
      argVar.set(argFunc());

      // This is a hack so that autoruns inside the body
      // of the #with get stopped sooner.  It reaches inside
      // our ReactiveVar to access its dep.

      Tracker.onInvalidate(function () {
        argVar.dep.changed();
      });

      // Take the case of `{{#with A}}{{B}}{{/with}}`.  The goal
      // is to not re-render `B` if `A` changes to become falsy
      // and `B` is simultaneously invalidated.
      //
      // A series of autoruns are involved:
      //
      // 1. This autorun (argument to Spacebars.With)
      // 2. Argument to Blaze.If
      // 3. Blaze.If view re-render
      // 4. Argument to Blaze.With
      // 5. The template tag `{{B}}`
      //
      // When (3) is invalidated, it immediately stops (4) and (5)
      // because of a Tracker.onInvalidate built into materializeView.
      // (When a View's render method is invalidated, it immediately
      // tears down all the subviews, via a Tracker.onInvalidate much
      // like this one.
      //
      // Suppose `A` changes to become falsy, and `B` changes at the
      // same time (i.e. without an intervening flush).
      // Without the code above, this happens:
      //
      // - (1) and (5) are invalidated.
      // - (1) runs, invalidating (2) and (4).
      // - (5) runs.
      // - (2) runs, invalidating (3), stopping (4) and (5).
      //
      // With the code above:
      //
      // - (1) and (5) are invalidated, invalidating (2) and (4).
      // - (1) runs.
      // - (2) runs, invalidating (3), stopping (4) and (5).
      //
      // If the re-run of (5) is originally enqueued before (1), all
      // bets are off, but typically that doesn't seem to be the
      // case.  Anyway, doing this is always better than not doing it,
      // because it might save a bunch of DOM from being updated
      // needlessly.
    });
  });

  return view;
};

// XXX COMPAT WITH 0.9.0
Spacebars.TemplateWith = Blaze._TemplateWith;
  Meteor.Spacebars = Spacebars;
};

},{}],18:[function(require,module,exports){
module.exports = function(Meteor) {
  var _ = Meteor.underscore;
  var Blaze = Meteor.Blaze;
  var UI = {};
  var Template;

// Packages and apps add templates on to this object.

/**
 * @summary The class for defining templates
 * @class
 * @instanceName Template.myTemplate
 */
Template = Blaze.Template;

var RESERVED_TEMPLATE_NAMES = "__proto__ name".split(" ");

// Check for duplicate template names and illegal names that won't work.
Template.__checkName = function (name) {
  // Some names can't be used for Templates. These include:
  //  - Properties Blaze sets on the Template object.
  //  - Properties that some browsers don't let the code to set.
  //    These are specified in RESERVED_TEMPLATE_NAMES.
  if (name in Template || _.contains(RESERVED_TEMPLATE_NAMES, name)) {
    if ((Template[name] instanceof Template) && name !== "body")
      throw new Error("There are multiple templates named '" + name + "'. Each template needs a unique name.");
    throw new Error("This template name is reserved: " + name);
  }
};

// XXX COMPAT WITH 0.8.3
Template.__define__ = function (name, renderFunc) {
  Template.__checkName(name);
  Template[name] = new Template("Template." + name, renderFunc);
  // Exempt packages built pre-0.9.0 from warnings about using old
  // helper syntax, because we can.  It's not very useful to get a
  // warning about someone else's code (like a package on Atmosphere),
  // and this should at least put a bit of a dent in number of warnings
  // that come from packages that haven't been updated lately.
  Template[name]._NOWARN_OLDSTYLE_HELPERS = true;
};

// Define a template `Template.body` that renders its
// `contentViews`.  `<body>` tags (of which there may be
// multiple) will have their contents added to it.

/**
 * @summary The [template object](#templates_api) representing your `<body>` tag.
 * @locus Client
 */
Template.body = new Template('body', function () {
  var parts = Template.body.contentViews;
  // enable lookup by setting `view.template`
  for (var i = 0; i < parts.length; i++)
    parts[i].template = Template.body;
  return parts;
});
Template.body.contentViews = []; // array of Blaze.Views
Template.body.view = null;

Template.body.addContent = function (renderFunc) {
  var kind = 'body_content_' + Template.body.contentViews.length;

  Template.body.contentViews.push(Blaze.View(kind, renderFunc));
};

// This function does not use `this` and so it may be called
// as `Meteor.startup(Template.body.renderIntoDocument)`.
Template.body.renderToDocument = function () {
  // Only do it once.
  if (Template.body.view)
    return;

  var view = Blaze.render(Template.body, document.body);
  Template.body.view = view;
};

// XXX COMPAT WITH 0.9.0
UI.body = Template.body;

// XXX COMPAT WITH 0.9.0
// (<body> tags in packages built with 0.9.0)
Template.__body__ = Template.body;
Template.__body__.__contentParts = Template.body.contentViews;
Template.__body__.__instantiate = Template.body.renderToDocument;
  Meteor.Template = Template;
};

},{}],19:[function(require,module,exports){
module.exports = function(Meteor) {
  var Tracker;
/////////////////////////////////////////////////////
// Package docs at http://docs.meteor.com/#tracker //
/////////////////////////////////////////////////////

/**
 * @namespace Tracker
 * @summary The namespace for Tracker-related methods.
 */
Tracker = {};

// http://docs.meteor.com/#tracker_active

/**
 * @summary True if there is a current computation, meaning that dependencies on reactive data sources will be tracked and potentially cause the current computation to be rerun.
 * @locus Client
 * @type {Boolean}
 */
Tracker.active = false;

// http://docs.meteor.com/#tracker_currentcomputation

/**
 * @summary The current computation, or `null` if there isn't one.  The current computation is the [`Tracker.Computation`](#tracker_computation) object created by the innermost active call to `Tracker.autorun`, and it's the computation that gains dependencies when reactive data sources are accessed.
 * @locus Client
 * @type {Tracker.Computation}
 */
Tracker.currentComputation = null;

// References to all computations created within the Tracker by id.
// Keeping these references on an underscore property gives more control to
// tooling and packages extending Tracker without increasing the API surface.
// These can used to monkey-patch computations, their functions, use
// computation ids for tracking, etc.
Tracker._computations = {};

var setCurrentComputation = function (c) {
  Tracker.currentComputation = c;
  Tracker.active = !! c;
};

var _debugFunc = function () {
  // We want this code to work without Meteor, and also without
  // "console" (which is technically non-standard and may be missing
  // on some browser we come across, like it was on IE 7).
  //
  // Lazy evaluation because `Meteor` does not exist right away.(??)
  return (typeof Meteor !== "undefined" ? Meteor._debug :
          ((typeof console !== "undefined") && console.log ?
           function () { console.log.apply(console, arguments); } :
           function () {}));
};

var _throwOrLog = function (from, e) {
  if (throwFirstError) {
    throw e;
  } else {
    var messageAndStack;
    if (e.stack && e.message) {
      var idx = e.stack.indexOf(e.message);
      if (idx >= 0 && idx <= 10) // allow for "Error: " (at least 7)
        messageAndStack = e.stack; // message is part of e.stack, as in Chrome
      else
        messageAndStack = e.message +
        (e.stack.charAt(0) === '\n' ? '' : '\n') + e.stack; // e.g. Safari
    } else {
      messageAndStack = e.stack || e.message;
    }
    _debugFunc()("Exception from Tracker " + from + " function:",
                 messageAndStack);
  }
};

// Takes a function `f`, and wraps it in a `Meteor._noYieldsAllowed`
// block if we are running on the server. On the client, returns the
// original function (since `Meteor._noYieldsAllowed` is a
// no-op). This has the benefit of not adding an unnecessary stack
// frame on the client.
var withNoYieldsAllowed = function (f) {
  if ((typeof Meteor === 'undefined') || Meteor.isClient) {
    return f;
  } else {
    return function () {
      var args = arguments;
      Meteor._noYieldsAllowed(function () {
        f.apply(null, args);
      });
    };
  }
};

var nextId = 1;
// computations whose callbacks we should call at flush time
var pendingComputations = [];
// `true` if a Tracker.flush is scheduled, or if we are in Tracker.flush now
var willFlush = false;
// `true` if we are in Tracker.flush now
var inFlush = false;
// `true` if we are computing a computation now, either first time
// or recompute.  This matches Tracker.active unless we are inside
// Tracker.nonreactive, which nullfies currentComputation even though
// an enclosing computation may still be running.
var inCompute = false;
// `true` if the `_throwFirstError` option was passed in to the call
// to Tracker.flush that we are in. When set, throw rather than log the
// first error encountered while flushing. Before throwing the error,
// finish flushing (from a finally block), logging any subsequent
// errors.
var throwFirstError = false;

var afterFlushCallbacks = [];

var requireFlush = function () {
  if (! willFlush) {
    // We want this code to work without Meteor, see debugFunc above
    if (typeof Meteor !== "undefined")
      Meteor._setImmediate(Tracker.flush);
    else
      setTimeout(Tracker.flush, 0);
    willFlush = true;
  }
};

// Tracker.Computation constructor is visible but private
// (throws an error if you try to call it)
var constructingComputation = false;

//
// http://docs.meteor.com/#tracker_computation

/**
 * @summary A Computation object represents code that is repeatedly rerun
 * in response to
 * reactive data changes. Computations don't have return values; they just
 * perform actions, such as rerendering a template on the screen. Computations
 * are created using Tracker.autorun. Use stop to prevent further rerunning of a
 * computation.
 * @instancename computation
 */
Tracker.Computation = function (f, parent) {
  if (! constructingComputation)
    throw new Error(
      "Tracker.Computation constructor is private; use Tracker.autorun");
  constructingComputation = false;

  var self = this;

  // http://docs.meteor.com/#computation_stopped

  /**
   * @summary True if this computation has been stopped.
   * @locus Client
   * @memberOf Tracker.Computation
   * @instance
   * @name  stopped
   */
  self.stopped = false;

  // http://docs.meteor.com/#computation_invalidated

  /**
   * @summary True if this computation has been invalidated (and not yet rerun), or if it has been stopped.
   * @locus Client
   * @memberOf Tracker.Computation
   * @instance
   * @name  invalidated
   * @type {Boolean}
   */
  self.invalidated = false;

  // http://docs.meteor.com/#computation_firstrun

  /**
   * @summary True during the initial run of the computation at the time `Tracker.autorun` is called, and false on subsequent reruns and at other times.
   * @locus Client
   * @memberOf Tracker.Computation
   * @instance
   * @name  firstRun
   * @type {Boolean}
   */
  self.firstRun = true;

  self._id = nextId++;
  self._onInvalidateCallbacks = [];
  // the plan is at some point to use the parent relation
  // to constrain the order that computations are processed
  self._parent = parent;
  self._func = f;
  self._recomputing = false;

  // Register the computation within the global Tracker.
  Tracker._computations[self._id] = self;

  var errored = true;
  try {
    self._compute();
    errored = false;
  } finally {
    self.firstRun = false;
    if (errored)
      self.stop();
  }
};

// http://docs.meteor.com/#computation_oninvalidate

/**
 * @summary Registers `callback` to run when this computation is next invalidated, or runs it immediately if the computation is already invalidated.  The callback is run exactly once and not upon future invalidations unless `onInvalidate` is called again after the computation becomes valid again.
 * @locus Client
 * @param {Function} callback Function to be called on invalidation. Receives one argument, the computation that was invalidated.
 */
Tracker.Computation.prototype.onInvalidate = function (f) {
  var self = this;

  if (typeof f !== 'function')
    throw new Error("onInvalidate requires a function");

  if (self.invalidated) {
    Tracker.nonreactive(function () {
      withNoYieldsAllowed(f)(self);
    });
  } else {
    self._onInvalidateCallbacks.push(f);
  }
};

// http://docs.meteor.com/#computation_invalidate

/**
 * @summary Invalidates this computation so that it will be rerun.
 * @locus Client
 */
Tracker.Computation.prototype.invalidate = function () {
  var self = this;
  if (! self.invalidated) {
    // if we're currently in _recompute(), don't enqueue
    // ourselves, since we'll rerun immediately anyway.
    if (! self._recomputing && ! self.stopped) {
      requireFlush();
      pendingComputations.push(this);
    }

    self.invalidated = true;

    // callbacks can't add callbacks, because
    // self.invalidated === true.
    for(var i = 0, f; f = self._onInvalidateCallbacks[i]; i++) {
      Tracker.nonreactive(function () {
        withNoYieldsAllowed(f)(self);
      });
    }
    self._onInvalidateCallbacks = [];
  }
};

// http://docs.meteor.com/#computation_stop

/**
 * @summary Prevents this computation from rerunning.
 * @locus Client
 */
Tracker.Computation.prototype.stop = function () {
  if (! this.stopped) {
    this.stopped = true;
    this.invalidate();
    // Unregister from global Tracker.
    delete Tracker._computations[this._id];
  }
};

Tracker.Computation.prototype._compute = function () {
  var self = this;
  self.invalidated = false;

  var previous = Tracker.currentComputation;
  setCurrentComputation(self);
  var previousInCompute = inCompute;
  inCompute = true;
  try {
    withNoYieldsAllowed(self._func)(self);
  } finally {
    setCurrentComputation(previous);
    inCompute = previousInCompute;
  }
};

Tracker.Computation.prototype._recompute = function () {
  var self = this;

  self._recomputing = true;
  try {
    while (self.invalidated && ! self.stopped) {
      try {
        self._compute();
      } catch (e) {
        _throwOrLog("recompute", e);
      }
      // If _compute() invalidated us, we run again immediately.
      // A computation that invalidates itself indefinitely is an
      // infinite loop, of course.
      //
      // We could put an iteration counter here and catch run-away
      // loops.
    }
  } finally {
    self._recomputing = false;
  }
};

//
// http://docs.meteor.com/#tracker_dependency

/**
 * @summary A Dependency represents an atomic unit of reactive data that a
 * computation might depend on. Reactive data sources such as Session or
 * Minimongo internally create different Dependency objects for different
 * pieces of data, each of which may be depended on by multiple computations.
 * When the data changes, the computations are invalidated.
 * @class
 * @instanceName dependency
 */
Tracker.Dependency = function () {
  this._dependentsById = {};
};

// http://docs.meteor.com/#dependency_depend
//
// Adds `computation` to this set if it is not already
// present.  Returns true if `computation` is a new member of the set.
// If no argument, defaults to currentComputation, or does nothing
// if there is no currentComputation.

/**
 * @summary Declares that the current computation (or `fromComputation` if given) depends on `dependency`.  The computation will be invalidated the next time `dependency` changes.

If there is no current computation and `depend()` is called with no arguments, it does nothing and returns false.

Returns true if the computation is a new dependent of `dependency` rather than an existing one.
 * @locus Client
 * @param {Tracker.Computation} [fromComputation] An optional computation declared to depend on `dependency` instead of the current computation.
 * @returns {Boolean}
 */
Tracker.Dependency.prototype.depend = function (computation) {
  if (! computation) {
    if (! Tracker.active)
      return false;

    computation = Tracker.currentComputation;
  }
  var self = this;
  var id = computation._id;
  if (! (id in self._dependentsById)) {
    self._dependentsById[id] = computation;
    computation.onInvalidate(function () {
      delete self._dependentsById[id];
    });
    return true;
  }
  return false;
};

// http://docs.meteor.com/#dependency_changed

/**
 * @summary Invalidate all dependent computations immediately and remove them as dependents.
 * @locus Client
 */
Tracker.Dependency.prototype.changed = function () {
  var self = this;
  for (var id in self._dependentsById)
    self._dependentsById[id].invalidate();
};

// http://docs.meteor.com/#dependency_hasdependents

/**
 * @summary True if this Dependency has one or more dependent Computations, which would be invalidated if this Dependency were to change.
 * @locus Client
 * @returns {Boolean}
 */
Tracker.Dependency.prototype.hasDependents = function () {
  var self = this;
  for(var id in self._dependentsById)
    return true;
  return false;
};

// http://docs.meteor.com/#tracker_flush

/**
 * @summary Process all reactive updates immediately and ensure that all invalidated computations are rerun.
 * @locus Client
 */
Tracker.flush = function (_opts) {
  // XXX What part of the comment below is still true? (We no longer
  // have Spark)
  //
  // Nested flush could plausibly happen if, say, a flush causes
  // DOM mutation, which causes a "blur" event, which runs an
  // app event handler that calls Tracker.flush.  At the moment
  // Spark blocks event handlers during DOM mutation anyway,
  // because the LiveRange tree isn't valid.  And we don't have
  // any useful notion of a nested flush.
  //
  // https://app.asana.com/0/159908330244/385138233856
  if (inFlush)
    throw new Error("Can't call Tracker.flush while flushing");

  if (inCompute)
    throw new Error("Can't flush inside Tracker.autorun");

  inFlush = true;
  willFlush = true;
  throwFirstError = !! (_opts && _opts._throwFirstError);

  var finishedTry = false;
  try {
    while (pendingComputations.length ||
           afterFlushCallbacks.length) {

      // recompute all pending computations
      while (pendingComputations.length) {
        var comp = pendingComputations.shift();
        comp._recompute();
      }

      if (afterFlushCallbacks.length) {
        // call one afterFlush callback, which may
        // invalidate more computations
        var func = afterFlushCallbacks.shift();
        try {
          func();
        } catch (e) {
          _throwOrLog("afterFlush", e);
        }
      }
    }
    finishedTry = true;
  } finally {
    if (! finishedTry) {
      // we're erroring
      inFlush = false; // needed before calling `Tracker.flush()` again
      Tracker.flush({_throwFirstError: false}); // finish flushing
    }
    willFlush = false;
    inFlush = false;
  }
};

// http://docs.meteor.com/#tracker_autorun
//
// Run f(). Record its dependencies. Rerun it whenever the
// dependencies change.
//
// Returns a new Computation, which is also passed to f.
//
// Links the computation to the current computation
// so that it is stopped if the current computation is invalidated.

/**
 * @summary Run a function now and rerun it later whenever its dependencies change. Returns a Computation object that can be used to stop or observe the rerunning.
 * @locus Client
 * @param {Function} runFunc The function to run. It receives one argument: the Computation object that will be returned.
 * @returns {Tracker.Computation}
 */
Tracker.autorun = function (f) {
  if (typeof f !== 'function')
    throw new Error('Tracker.autorun requires a function argument');

  constructingComputation = true;
  var c = new Tracker.Computation(f, Tracker.currentComputation);

  if (Tracker.active)
    Tracker.onInvalidate(function () {
      c.stop();
    });

  return c;
};

// http://docs.meteor.com/#tracker_nonreactive
//
// Run `f` with no current computation, returning the return value
// of `f`.  Used to turn off reactivity for the duration of `f`,
// so that reactive data sources accessed by `f` will not result in any
// computations being invalidated.

/**
 * @summary Run a function without tracking dependencies.
 * @locus Client
 * @param {Function} func A function to call immediately.
 */
Tracker.nonreactive = function (f) {
  var previous = Tracker.currentComputation;
  setCurrentComputation(null);
  try {
    return f();
  } finally {
    setCurrentComputation(previous);
  }
};

// http://docs.meteor.com/#tracker_oninvalidate

/**
 * @summary Registers a new [`onInvalidate`](#computation_oninvalidate) callback on the current computation (which must exist), to be called immediately when the current computation is invalidated or stopped.
 * @locus Client
 * @param {Function} callback A callback function that will be invoked as `func(c)`, where `c` is the computation on which the callback is registered.
 */
Tracker.onInvalidate = function (f) {
  if (! Tracker.active)
    throw new Error("Tracker.onInvalidate requires a currentComputation");

  Tracker.currentComputation.onInvalidate(f);
};

// http://docs.meteor.com/#tracker_afterflush

/**
 * @summary Schedules a function to be called during the next flush, or later in the current flush if one is in progress, after all invalidated computations have been rerun.  The function will be run once and not on subsequent flushes unless `afterFlush` is called again.
 * @locus Client
 * @param {Function} callback A function to call at flush time.
 */
Tracker.afterFlush = function (f) {
  afterFlushCallbacks.push(f);
  requireFlush();
};
  Meteor.Tracker = Tracker;
};

},{}]},{},[1]);
