module.exports = function(jQuery,underscore) {
    //Create a new meteor cient andd append it to the jQuery object
    jQuery.Meteor = require("meteor-client")(jQuery,underscore);

    /**
     * Compile the spacebars template and generate the JS renderer functions for each one
     * @method spacebars
     * @return {object} renderer functions
     */
    jQuery.fn.spacebars = function() {
	//Renderer functions
        var renderers = {}
        this.each(function(index,obj) {
	    //Get template name
            var name = obj.getAttribute('name');
	    //Create references that will be called in the renderer function
            var HTML = jQuery.Meteor.HTML;
            var Blaze = jQuery.Meteor.Blaze;
            var Spacebars = jQuery.Meteor.Spacebars;
	    //Compile JS
            var render = eval(jQuery.Meteor.SpacebarsCompiler.compile(obj.innerHTML, {isTemplate: true}));
            //Add renderer function for template
            renderers[name] = render;
        });
	//REturn all the renderer functionas
        return renderers;
    };

    /**
     * Instantiates a blaze template instance 
     * @method blaze
     * @param {function} renderer - renderer function for the template
     */
    jQuery.fn.blaze = function(renderer) {
        return this.each(function(index,obj) {
		//Check if the template has been created already
		if (obj.instance)
			//Exception
			throw new Exception("Template already instantiated for " + obj);
		//Create template instance
		obj.instance = new jQuery.Meteor.Blaze.Template(obj.id,renderer);
	});
    };

    /**
     * Render an instantiated template view
     * @method render
     * @param {object} [data] - data object to render templete with
     * @param {object} [after] - child node to insert the template after
     */
    jQuery.fn.render = function(data,after) {
	return this.each(function(index,obj) {
		//Check that the template has been created already
		if (!obj.instance)
			//Exception
			throw new Exception("Template not instantiated for " + obj);
		//Render temmplate instance
		jQuery.Meteor.Blaze.renderWithData(obj.instance, jQuery.extend({},jQuery(obj).data(),data), obj, after);
	});
    };

    /**
     * Add a function helper to an instantiated template
     * @method helpers
     * @params {string} key - helper name
     * @params {object|function} value - helper
     */
    jQuery.fn.helpers = function(key,val) {
	return this.each(function(index,obj) {
		//Check that the template has been created already
		if (!obj.instance)
			//Exception
			throw new Exception("Template not instantiated for " + obj);
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
     * @params {string} key - helper name
     * @params {object|function} reactive - reactive var, must be an instance of Meteor.ReactiveVar
     */
    jQuery.fn.reactive = function(key,reactive) {
	return this.each(function(index,obj) {
		//Check that the template has been created already
		if (!obj.instance)
			//Exception
			throw new Exception("Template not instantiated for " + obj);
		//Create helper map
                var helper = {};
		//Set hepler
		helper[key] = function () {
			return reactive.get();
		};
		//Add helper
		obj.instance.helpers(helper);
	});
    };

    /**
     * Set renderer functions for live included templates
     * It will create a helper function that returns a template instance with the associated render function. As an extra, it will copy the child helpers, that is, if a template includes a "foo" template, any "foo.bar" helper defined, will be copied to the new child template and renamed to "bar".
     * @example
     * <script type="text/spacebars" name="list">
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
     * @return renderer functions
     */
    jQuery.fn.includes = function(key,renderer) {
	return this.each(function(index,obj) {
		//Check that the template has been created already
		if (!obj.instance)
			//Exception
			throw new Exception("Template not instantiated for " + obj);
		//Create helper map
                var helper = {};
		//Set functionhepler
		helper[key] =  function () { 
			var h={},k;
			//Create new template
			var include = new jQuery.Meteor.Blaze.Template(obj.id+"."+key,renderer);
			//HACK! helpers are stored with " "+name
			for (k in obj.instance.__helpers)
				//Check if it starts with template name
				if (k.indexOf(" "+key+".")==0)
					//Add without prefix
					h[k.substring(key.length+2)] = obj.instance.__helpers[k];
			//Add helpers
			include.helpers(h);
			//Return template
			return include;
		}
		//Add helper
		obj.instance.helpers(helper);
	});
    };
};
