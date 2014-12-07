FL.ScreenWin = function(win) {
	FL.ScreenWin._super.call(this);
	this.win = win;
	localStorage["wins"] = +(localStorage["wins"] || 0);
	localStorage["losses"] = +(localStorage["losses"] || 0);
	localStorage["wisdom"] = +(localStorage["wisdom"] || 0) + 1;
	if (win) {
		localStorage["wins"] = +localStorage["wins"] + 1;
	} else {
		localStorage["losses"] = +localStorage["losses"] + 1;
	}
};

JW.extend(FL.ScreenWin, JW.UI.Component, {
	renderTitle: function(el) {
		el.text(this.win ? "You win!" : "You lost...");
	},

	renderWins: function(el) {
		el.text(localStorage["wins"]);
	},

	renderLosses: function(el) {
		el.text(localStorage["losses"]);
	},

	renderDifficulty: function(el) {
		el.text(Math.round(FL.AI.productionCoef * 100));
	},

	renderDifficultyModifier: function(el) {
		if (this.win) {
			el.text("+" + Math.round(FL.AI.productionCoefPerWin * 100));
		} else {
			el.text("-" + Math.round(FL.AI.productionCoefPerLoss * 100));
		}
	},

	renderClear: function(el) {
		el.click(JW.inScope(function(event) {
			event.preventDefault();
			localStorage["wins"] = 0;
			localStorage["losses"] = 0;
			this.getElement("wins").text(0);
			this.getElement("losses").text(0);
			this.getElement("difficulty").text(100);
			this.getElement("difficulty-modifier").text(0);
		}, this));
	},

	renderWisdom: function(el) {
		el.text(FL.ScreenWin.wisdoms[+localStorage["wisdom"] % FL.ScreenWin.wisdoms.length]);
	}
});

FL.ScreenWin.wisdoms = [
	"Soldiers usually win the battles and generals get the credit for it. -- Napoleon",
	"The tragedy of war is that it uses man's best to do man's worst.",
	"The Fourth World War will be fought with stones. -- Einstein",
	"Diplomats are just as essential in starting a war as soldiers in finishing it. -- Rogers",
	"There is no such thing as an inevitable war. If war comes it will be from failure of human wisdom. -- Law",
	"Dictators ride to and from on tigers from which they dare not dismount. And the tigers are getting hungry. -- Churchill"
];
