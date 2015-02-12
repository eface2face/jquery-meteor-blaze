# jQuery Meteor blaze template plugin
This project uses the [Meteor client libraries](https://github.com/eface2face/meteor-client) and wraps them in a easy to use jQuery plugin.

## Install
You can install it with npm
```bash
npm install jquery-meteor-blaze
```
## Usage
You can either use the node module
```js
require('jquery-meteor-blaze')($,_);
```
Or use the scripts under the *dist* directory
```js
    <script type="text/javascript" src="lodash.js"></script>
    <script type="text/javascript" src="jquery.min.js"></script>
    <script type="text/javascript" src="jquery-meteor-blaze.devel.js"></script>º
```

## Dependencies
The plugin requires underscore or lodash.

## Methods

#### spacebars() 

Compile the spacebars template and generate the JS renderer functions for each one

***Returns***: `object`, renderer functions

***Example***:
```js
<script type="text/spacebars" name="list">
        Below is the list of items:
        <ol>
        {{#each posts}}
                <li><input type="checkbox">{{ title }}</li>
        {{/each}}
        </ol>
</script>
<script>
	var templates   = $("script[type='text/spacebars']").spacebars();
</script>
```

#### blaze(renderer) 

Instantiates a blaze template instance

***Parameters***

***renderer***: `function`, renderer function for the template



#### render(data, after) 

Render an instantiated template view

***Parameters***

***data***: `object`, data object to render templete with

***after***: `object`, child node to insert the template after

***Example***:
```js
<script>
	 $("#list")
                .blaze(templates['list'])
		.render({"posts": [{title: "first"},{title: "second"}]);

</script>
```


#### helpers(key, value) 

Add a function helper to an instantiated template

***Parameters***

***key***: `string`, helper name

***value***: `object | function`, helper



#### reactive(key, reactive) 

Add a reactive var to an instantiated template

***Parameters***

***key***: `string`, helper name

***reactive***: `object | function`, reactive var, must be an instance of Meteor.ReactiveVar or Meteor.ReactiveObjectMap


```js
<script>
	var posts = new $.Meteor.ReactiveVar([{title: "first"},{title: "second"}]);
	$("#list")
                .blaze(templates['list'])
		.reactive('posts',posts)
		.render();

</script>
```


#### includes(key, renderer) 

Set renderer functions for live included templates
It will create a helper function that returns a template instance with the associated render function. As an extra, it will copy the child helpers, that is, if a template includes a "foo" template, any "foo.bar" helper defined, will be copied to the new child template and renamed to "bar".

***Parameters***

***key***: `string`, helper name

***renderer***: `function`, renderer function for the template


***Example***:
```js
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
```



** ** **










