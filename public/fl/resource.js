FL.Resource = {
	initDescription: function() {
		JW.Array.each(FL.Resource.typeArray, function(resource) {
			var html = "";
			if (resource.description) {
				html += resource.description + "<br>";
			}
			if (resource.bonus) {
				html += 'Increases production by <span class="fl-id">' + resource.bonus + '</span>.<br>';
			}
			var unitTypes = JW.Array.filter(FL.Unit.typeArray, function(unitType) {
				return (unitType.resources != null) &&
					JW.Array.containsItem(unitType.resources, resource.id);
			});
			if (unitTypes.length) {
				var names = JW.Array.map(unitTypes, function(unitType) {
					return '<span class="fl-id">' + unitType.name + '</span>';
				});
				html += 'Required to produce units: ' + names.join(", ") + '<br />';
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
		aiProduction: false,
		profit: 4 // to equalize resources in map generator
	}, {
		id: "iron",
		name: "Iron",
		bonus: 6,
		count: 15,
		aiProduction: false,
		profit: 6
	}, {
		id: "oil",
		name: "Oil",
		bonus: 10,
		count: 10,
		aiProduction: false,
		profit: 10
	}, {
		id: "aluminum",
		name: "Aluminum",
		bonus: 15,
		count: 5,
		aiProduction: false,
		profit: 15
	}, {
		id: "yard",
		name: "Advanced training yard",
		count: 10,
		deniedAtStart: true,
		minDistanceSqr: 30,
		aiProduction: true,
		profit: 10
	}, {
		id: "light",
		name: "Light vehicle factory",
		count: 10,
		deniedAtStart: true,
		minDistanceSqr: 30,
		aiProduction: true,
		profit: 12
	}, {
		id: "heavy",
		name: "Heavy vehicle factory",
		count: 6,
		deniedAtStart: true,
		minDistanceSqr: 50,
		aiProduction: true,
		profit: 15
	}, {
		id: "airport",
		name: "Airport",
		description: "Drops paratroopers to any visible tile.",
		count: 4,
		deniedAtStart: true,
		minDistanceSqr: 100,
		aiProduction: false,
		aiProfit: 8,
		profit: 8
	}
];

FL.Resource.types = JW.Array.index(FL.Resource.typeArray, JW.byField("id"));
