# jQuery Meteor blaze template plugin

## Introduction

## Usage

## Methods

#### spacebars() 

Compile the spacebars template and generate the JS renderer functions for each one

***Returns***: `object`, renderer functions


#### blaze(renderer) 

Instantiates a blaze template instance

***Parameters***

***renderer***: `function`, renderer function for the template



#### render(data, after) 

Render an instantiated template view

***Parameters***

***data***: `object`, data object to render templete with

***after***: `object`, child node to insert the template after



#### helpers(key, value) 

Add a function helper to an instantiated template

***Parameters***

***key***: `string`, helper name

***value***: `object | function`, helper



#### reactive(key, reactive) 

Add a reactive var to an instantiated template

***Parameters***

***key***: `string`, helper name

***reactive***: `object | function`, reactive var, must be an instance of Meteor.ReactiveVar



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










