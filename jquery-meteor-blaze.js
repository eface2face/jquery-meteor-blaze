module.exports = function(jQuery,underscore) {
    //Create a new meteor cient andd append it to the jQuery object
    jQuery.Meteor = require("meteor-client")(jQuery,underscore);
   
    jQuery.fn.compile = function() {
        var renderers = {}
        this.each(function(index,obj) {
            var name = obj.getAttribute('name');
            var HTML = jQuery.Meteor.HTML;
            var Blaze = jQuery.Meteor.Blaze;
            var Spacebars = jQuery.Meteor.Spacebars;
            var render = eval(jQuery.Meteor.SpacebarsCompiler.compile(obj.innerHTML, {isTemplate: true}));
            renderers[name] = render;
        });
        return renderers;
    };

    jQuery.fn.blaze = function(renderer,data,helpers,events) {
        return this.each(function(index,obj) {
		//Create template instance
		obj.instance = new jQuery.Meteor.Blaze.Template(obj.id,renderer);
		//Set event map
		obj.instance.events(events);
		//Set helpers
		obj.instance.helpers(helpers);
		//Render template
		jQuery.Meteor.Blaze.renderWithData(obj.instance, data, obj);
	});
    };
};
