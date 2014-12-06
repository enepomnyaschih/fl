var data, app;

jQuery(function() {
	FL.Resource.initDescription();
	data = new FL.Data();
	app = new FL.App(data);
	app.renderTo("body");
});
