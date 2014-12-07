FL.Resource = {
	initDescription: function() {
		JW.Array.each(FL.Resource.typeArray, function(resource) {
			var html = "";
			if (resource.bonus) {
				html += "Increases production by " + resource.bonus + ".<br>";
			}
			var unitTypes = JW.Array.filter(FL.Unit.typeArray, function(unitType) {
				return (unitType.resources != null) &&
					JW.Array.containsItem(unitType.resources, resource.id);
			});
			if (unitTypes.length) {
				var names = JW.Array.map(unitTypes, JW.byField("name"));
				html += "Required to produce units: " + names.join(", ") + "<br />";
			}
			resource.descriptionHtml = html;
		});
	}
};

FL.Resource.typeArray = [
	{
		id: "copper",
		name: "Copper",
		bonus: 4,
		count: 20,
		aiProfit: 4
	}, {
		id: "iron",
		name: "Iron",
		bonus: 6,
		count: 15,
		aiProfit: 6
	}, {
		id: "oil",
		name: "Oil",
		bonus: 10,
		count: 10,
		aiProfit: 10
	}, {
		id: "aluminum",
		name: "Aluminum",
		bonus: 15,
		count: 5,
		aiProfit: 15
	}, {
		id: "yard",
		name: "Advanced training yard",
		count: 10,
		aiProfit: 5
	}, {
		id: "light",
		name: "Light vehicle factory",
		count: 10,
		aiProfit: 8
	}, {
		id: "heavy",
		name: "Heavy vehicle factory",
		count: 6,
		aiProfit: 10
	}/*, {
		id: "airport",
		name: "Airport",
		count: 4,
		aiProfit: 8
	}*/
];

FL.Resource.types = JW.Array.index(FL.Resource.typeArray, JW.byField("id"));
