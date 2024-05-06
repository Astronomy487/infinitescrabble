let main = document.querySelector("main");
let nav = document.querySelector("nav");
let saveButton = document.querySelector("#submit-button");
let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let today = dayCount(new Date());
let dayAccents = ["#E15554", "#F6913D", "#E1BC29", "#3BB273", "#59AEF3", "#6E4BEE", "#CC46F8"];

function shuffle(t){let f=t.length,n;for(;0<f;)n=Math.floor(Math.random()*f),f--,[t[f],t[n]]=[t[n],t[f]];return t}
let pointValues = {
	A: 1, E: 1, I: 1, O: 1, U: 1, L: 1, N: 1, S: 1, T: 1, R: 1,
	D: 2, G: 2,
	B: 3, C: 3, M: 3, P: 3,
	F: 4, H: 4, V: 4, W: 4, Y: 4,
	K: 5,
	J: 8, X: 8,
	Q: 10, Z: 10
};

let metadata;

//dragging functionality
let dragging = null;
document.addEventListener("mousedown", function(event) {
	if (!dragging) {
		let rect = main.getBoundingClientRect();
		dragging = {initX: event.clientX - rect.left, initY: event.clientY - rect.top, element: main};
		dragging.element.setAttribute("dragging", "true");
	}
});
document.addEventListener("mousemove", function(event) {
	if (dragging) {
		let x = event.clientX - dragging.initX;
		let y = event.clientY - dragging.initY;
		if (dragging.tile) {
			x = Math.round(x/64)*64;
			y = Math.round(y/64)*64;
			//find if any OTHER tile is occupying this spot
			let xCoord = x/64;
			let yCoord = y/64;
			for (let tile of board) if (tile != dragging.tile && xCoord == tile.x && yCoord == tile.y) return;
			dragging.tile.x = xCoord;
			dragging.tile.y = yCoord;
			//wait actually, lets find if we're trying to dock
			for (let d = 0; d < docks.length; d++) { // i hate coordinates
				let dock = docks[d];
				if (dock.querySelector(".tile")) continue;
				if (event.clientX < dock.getBoundingClientRect().left || event.clientX > dock.getBoundingClientRect().right || event.clientY < dock.getBoundingClientRect().y) continue;
				let rect = dock.getBoundingClientRect();
				dragging.tile.element.remove();
				dock.appendChild(dragging.tile.element);
				dragging.tile.x = null;
				dragging.tile.y = null;
				dragging.tile.dock = d;
				dragging = null;
				runSubmitMove();
			}
		}
		if (!dragging) return;
		dragging.element.style.left = x + "px";
		dragging.element.style.top = y + "px";
	}
});
document.addEventListener("mouseup", function(event) {
	if (dragging) {
		let x = event.clientX - dragging.initX;
		let y = event.clientY - dragging.initY;
		dragging.element.style.zIndex = null;
		dragging.element.setAttribute("dragging", "false");
		if (dragging.tile) runSubmitMove();
		if (dragging.element == main) {
			metadata.pageCoords = x + "," + y;
			makeBackgroundSquares();
		}
		dragging = null;
	}
});

function runSubmitMove() {
	//a wrapper function LOLOL
	let result = submitMove();
	let valid = result;
	if (result) for (let word of result) if (!word.isValid) valid = false;
	if (valid) {
		saveButton.setAttribute("active", "true");
		let points = 0;
		for (let word of result) points += word.points;
		saveButton.innerText = "Submit for " + points + " " + plural("pt.", "pts.", points);
		saveButton.onclick = function() {
			if (confirm("Submit this move for " + points + " "+plural("point", "points", points)+"?")) {
				metadata.lastSubmitDate = today;
				visualRefreshTiles();
				for (let word of result) metadata.history.push(today + "," + word.word + "," + word.points);
				makeCommentAboutTodaysMove();
				updatePointCounter();
			}
		}
	} else {
		saveButton.setAttribute("active", "false");
		saveButton.innerHTML = "&nbsp;";
		saveButton.onclick = null;
	}
}

let validWords = {};
for (let validWord of wholeWordList.split(",")) validWords[validWord] = true;

function dayCount(x) {
	return Math.floor(((x.getTime()) - (new Date("Jan 1 2023").getTime())) / 86400000);
}

let board = [];
let lettersGiven = [];
function pickLetters() {
	board = board.filter((a) => a.date != today);
	while (!lettersGiven.length) {
		lettersGiven = shuffle("AAAAAAAAABBCCDDDDEEEEEEEEEEEEFFGGGHHIIIIIIIIIJKLLLLMMNNNNNNOOOOOOOOPPQRRRRRRSSSSTTTTTTUUUUVVWWXYYZ".split(''));
		lettersGiven.length = 7;
		let pointSum = 0;
		for (let letterGiven of lettersGiven) pointSum += pointValues[letterGiven];
		if (pointSum < 10 || pointSum > 16) lettersGiven = [];
	}
	for (let i = 0; i < 7; i++) {
		let tile = {x: null, y: null, letter: lettersGiven[i], date: today, dock: i};
		board.push(tile);
		makeTile(tile);
	}
	metadata.lastTilePick = today;
	//location.reload(); //idk WHY but stuff breaks the first time letters are loaded to the dock. idkidkidk
	visualRefreshTiles();
}

//get rid of all tiles and put them back. just in case shenanigans happened
function visualRefreshTiles() {
	for (let element of document.querySelectorAll(".tile")) element.remove();
	for (let tile of board) makeTile(tile);
}

function tileAt(x, y) {
	for (let tile of board) if (tile.x == x && tile.y == y) return tile;
	return null;
}

//make the docks
let docks = [];
for (let i = 0; i < 7; i++) {
	let dock = nav.appendChild(document.createElement("div"));
	dock.setAttribute("class", "tileSlot dock");
	docks.push(dock);
	dock.innerHTML = "&nbsp;";
}

function makeBackgroundSquares() {
	for (let gridTile of document.querySelectorAll(".grid")) gridTile.remove();
	let yMin = -metadata.pageCoords.split(",")[1] / 64
	let yMax = yMin + window.innerHeight / 64;
	let xMin = -metadata.pageCoords.split(",")[0] / 64
	let xMax = xMin + window.innerWidth / 64;
	yMin = Math.floor(yMin) - 5;
	yMax = Math.ceil(yMax) + 5;
	xMin = Math.floor(xMin) - 5;
	xMax = Math.ceil(xMax) + 5;
	for (let y = yMin; y <= yMax; y++) {
		for (let x = xMin; x <= xMax; x++) {
			let letterMult = letterMultiplier(x, y);
			let wordMult = wordMultiplier(x, y);
			if (letterMult == 1 && wordMult == 1 && (x!=0||y!=0)) continue;
			let gridTile = main.appendChild(document.createElement("div"));
			gridTile.setAttribute("class", "grid letter-multiplier-" + letterMult + " word-multiplier-"+wordMult);
			gridTile.style.top = "calc("+y+" * var(--tile))";
			gridTile.style.left = "calc("+x+" * var(--tile))";
			if (letterMult > 1) gridTile.innerHTML = letterMult + "×<span>letter</span>"
			if (wordMult > 1) gridTile.innerHTML = wordMult + "×<span>word</span>"
			if (x == 0 && y == 0) gridTile.innerHTML = "★";
		}
	}
}

//make some tiles to push around
function makeTile(tile) {
	let element = main.appendChild(document.createElement("div"));
	element.setAttribute("class", "tile");
	element.setAttribute("active", tile.date > metadata.lastSubmitDate ? "true" : "false");
	element.innerText = tile.letter;
	let pointValue = pointValues[tile.letter];
	let pointText = element.appendChild(document.createElement("div"));
	pointText.setAttribute("class", "points");
	pointText.innerText = pointValue;
	/* element.style.setProperty("--accent", {
		"1": "#222",
		"2": "#822",
		"3": "#882",
		"4": "#282",
		"5": "#288",
		"8": "#228",
		"10":"#828",
		"0": "gray"
	}[pointValue]); */
	element.style.setProperty("--accent", dayAccents[tile.date%7]);
	if (tile.dock == null) {
		element.style.top = "calc("+tile.y+" * var(--tile))";
		element.style.left = "calc("+tile.x+" * var(--tile))";
	} else {
		element.remove();
		docks[tile.dock].appendChild(element);
	}
	tile.element = element;
	if (tile.date > metadata.lastSubmitDate) element.addEventListener("mousedown", function(event) {
		if (dragging) return;
		if (tile.x == null) {
			let newSpace = unoccupiedSpace();
			tile.x = newSpace.x;
			tile.y = newSpace.y;
			tile.dock = null;
			tile.element.remove();
			main.appendChild(element);
			element.style.top = "calc("+tile.y+" * var(--tile))";
			element.style.left = "calc("+tile.x+" * var(--tile))";
			runSubmitMove();
			return;
		}
		let mainRect = main.getBoundingClientRect();
		let rect = element.getBoundingClientRect();
		dragging = {initX: event.clientX - rect.left + mainRect.left, initY: event.clientY - rect.top + mainRect.top, element: element, tile: tile};
		element.setAttribute("dragging", "true");
		element.style.zIndex = 5;
	});
	if (tile.date > metadata.lastSubmitDate) element.style.animationDuration = 1 + 0.5 * Math.random() + "s";
	if (tile.date <= metadata.lastSubmitDate) element.setAttribute("date", dateNumberToDateText(tile.date));
	return tile;
}

function submitMove() {
	//FIRST: make a list of the tiles we placed
	let moveTiles = board.filter((a) => a.date == today && a.dock == null);
	//make sure they are all colinear
	let sameX = true;
	for (let moveTile of moveTiles) if (moveTile.x != moveTiles[0].x) sameX = false;
	let sameY = true;
	for (let moveTile of moveTiles) if (moveTile.y != moveTiles[0].y) sameY = false;
	if (!sameX && !sameY) return false;
	//make sure it is somehow adjacent to an existing tile
	let adjacent = false;
	for (let moveTile of moveTiles) {
		for (let [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
			let neighbor = tileAt(moveTile.x + dx, moveTile.y + dy);
			if (neighbor && neighbor.date < today) adjacent = true;
		}
	}
	if (!adjacent && metadata.lastSubmitDate) return false;
	if (!metadata.lastSubmitDate && !tileAt(0,0)) return false;
	/* //make sure every tile is adjacent to SOMETHING (even if another today tile)
	for (let moveTile of moveTiles) {
		adjacent = false;
		for (let [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
			let neighbor = tileAt(moveTile.x + dx, moveTile.y + dy);
			if (neighbor) adjacent = true;
		}
		if (!adjacent) return false;
	} */
	//for all move tiles, traverse left and up; find the full word being spelled; make sure it's a valid word
	let considered = []; //x,y,dx,dy
	let oneWordContainsAllMoveTiles = false;
	let wordsEarned = [];
	for (let moveTile of moveTiles) {
		for (let [dx, dy] of [[0, 1], [1, 0]]) {
			let word = "";
			let wordValue = 0;
			let [x, y] = [moveTile.x - dx, moveTile.y - dy];
			let tileBefore = tileAt(x, y);
			if (tileBefore) {
				if (tileBefore.date == today) continue; //if before us is a today tile, don't run this check
			}
			while (tileAt(x, y)) [x, y] = [x-dx, y-dy];
			[x, y] = [x+dx, y+dy];
			let considerationCode = [x,y,dx,dy].join(",");
			if (considered.includes(considerationCode)) continue;
			considered.push(considerationCode);
			let totalWordMultiplier = 1;
			let tilesUsed = []; //at least one word formed must use all of moveTiles
			while (tileAt(x, y)) {
				let tile = tileAt(x, y);
				word += tile.letter;
				wordValue += pointValues[tile.letter] * (tile.date == today ? letterMultiplier(x, y) : 1);
				tilesUsed.push(tileAt(x,y));
				if (tile.date == today) totalWordMultiplier *= wordMultiplier(x, y);
				x += dx;
				y += dy;
			}
			if (word.length == 1) continue;
			if (!oneWordContainsAllMoveTiles) {
				oneWordContainsAllMoveTiles = true;
				for (let mt of moveTiles) if (!tilesUsed.includes(mt)) oneWordContainsAllMoveTiles = false;
			}
			wordsEarned.push({
				word: word,
				points: wordValue * totalWordMultiplier,
				isValid: isValidWord(word)
			});
		}
	}
	if (!oneWordContainsAllMoveTiles) return false;
	return wordsEarned;
}

function isValidWord(string) {
	return validWords[string];
}

function letterMultiplier(x, y) {
	x = Math.abs(x);
	y = Math.abs(y);
	if (x+y == 0) return 1;
	if (x%7 == 1 && y%7 == 1) return 2;
	if (x%7 == 1 && y%7 == 5) return 2;
	if (x%7 == 5 && y%7 == 1) return 2;
	if (x%7 == 0 && y%7 == 4) return 2;
	if (x%7 == 4 && y%7 == 0) return 2;
	if (x%7 == 2 && y%7 == 2) return 3;
	if (x%7 == 6 && y%7 == 2) return 3;
	if (x%7 == 2 && y%7 == 6) return 3;
	return 1;
}

function wordMultiplier(x, y) {
	if (letterMultiplier(x, y) != 1) return 1;
	x = Math.abs(x);
	y = Math.abs(y);
	if (x+y == 0) return 1;
	if (x%7 == 0 && y%7 == 0) return 3;
	if (x%7 == y%7) return 2;
	return 1;
}

function dateNumberToDateText(num) {
	//num is days since jan 1 2023!
	let day = new Date("Jan 1 2023");
	day.setDate(day.getDate() + num);
	return day.getDate() + " " + months[day.getMonth()] + " " + (day.getYear()+1900);
}

function load() {
	if (localStorage.getItem("dailyScrabble")) {
		metadata = {};
		board = [];
		for (let line of localStorage.getItem("dailyScrabble").split("\n")) {
			if (line.includes(":")) {
				line = line.split(":");
				metadata[line[0]] = line[1];
			} else {
				line = line.split(",");
				let tile = {
					x: line[0],
					y: line[1],
					letter: line[2],
					date: parseInt(line[3]),
					dock: line[4]
				};
				tile.x = tile.x.length ? parseInt(tile.x) : null;
				tile.y = tile.y.length ? parseInt(tile.y) : null;
				tile.dock = tile.dock.length ? parseInt(tile.dock) : null;
				board.push(tile);
			}	
		}
		metadata.lastSubmitDate = parseInt(metadata.lastSubmitDate);
		metadata.lastTilePick = parseInt(metadata.lastTilePick);
		metadata.history = metadata.history ? metadata.history.split(";") : [];
		//destroy any unsubmitted tiles that don't matter anymore
		board = board.filter((a) => a.date <= metadata.lastSubmitDate || a.date == today);
		board = board.filter((a) => a.dock == null || a.date == today);
		//maybe pick new tiles?
		if (metadata.lastTilePick < today) {
			pickLetters();
		}
	} else {
		metadata = {
			lastSubmitDate: 0, //last time we submitted. destroy anything between lastSubmitDate and today
			lastTilePick: 0, //last time tiles were picked. if earlier than today, generate some for today!
			history: [], //each entry in array looks like 231,PARTY,23 date,WORD,points
			pageCoords: (window.innerWidth/2+32) + "," + (window.innerHeight/2+32-64)
		};
		board = [];
		pickLetters();
	}
	visualRefreshTiles();
	updatePointCounter();
	makeBackgroundSquares();
	runSubmitMove();
	main.style.left = metadata.pageCoords.split(",")[0] + "px";
	main.style.top = metadata.pageCoords.split(",")[1] + "px";
	if (metadata.lastSubmitDate == today) makeCommentAboutTodaysMove();
}

function save() {
	let saveData = [];
	saveData.push("lastSubmitDate:" + metadata.lastSubmitDate);
	saveData.push("lastTilePick:" + metadata.lastTilePick);
	saveData.push("pageCoords:" + metadata.pageCoords);
	saveData.push("history:" + metadata.history.join(";"));
	for (let tile of board) {
		saveData.push([tile.x, tile.y, tile.letter, tile.date, tile.dock].join(","));
	}
	localStorage.setItem("dailyScrabble", saveData.join("\n"));
}

load();

function unoccupiedSpace() {
	let x = 0;
	let y = 0;
	while (true) {
		if (!tileAt(x, y)) return {x:x, y:y};
		if (!tileAt(-x, y)) return {x:-x, y:y};
		if (!tileAt(x, -y)) return {x:x, y:-y};
		if (!tileAt(-x, -y)) return {x:-x, y:y};
		[x, y] = [y, x];
		if (!tileAt(x, y)) return {x:x, y:y};
		if (!tileAt(-x, y)) return {x:-x, y:y};
		if (!tileAt(x, -y)) return {x:x, y:-y};
		if (!tileAt(-x, -y)) return {x:-x, y:y};
		[x, y] = [y, x];
		x++;
		if (x > y) {
			x = 0;
			y++;
		}
	}
}

function hardReset() {
	localStorage.removeItem("dailyScrabble");
	document.body.setAttribute("onbeforeunload", "");
	location.reload();
}

//makes the nav just contain a little comment about the move they made today
function makeCommentAboutTodaysMove() {
	while (nav.firstChild) nav.firstChild.remove();
	saveButton.setAttribute("active", "false");
	let comment = nav.appendChild(document.createElement("div"));
	comment.setAttribute("class", "comment");
	let movesMade = [];
	for (let moveString of metadata.history.filter((a) => a.startsWith(today + ","))) {
		moveString = moveString.split(",");
		movesMade.push("<b>" + moveString[1] + "</b> for " + moveString[2] + " " + plural("point", "points", moveString[2]));
	}
	if (movesMade.length == 1) comment.innerHTML = "Today you played " + movesMade[0] + ".";
	else if (movesMade.length == 2) comment.innerHTML = "Today you played " + movesMade.join(" and ") + ".";
	else comment.innerHTML = "Today you played " + movesMade.slice(0, -1).join(", ") + " and " + movesMade.slice(-1) + ".";
	comment.innerHTML += "<br>Come back tomorrow!";
}

function plural(sing, plu, n) {
	return n == 1 ? sing : plu;
}

//sh i wont tell anybody
function pretendDayPassed() {
	metadata.lastSubmitDate--;
	metadata.lastTilePick--;
	for (let tile of board) tile.date--;
	for (let i = 0; i < metadata.history.length; i++) {
		metadata.history[i] = metadata.history[i].split(",");
		metadata.history[i][0]--;
		metadata.history[i] = metadata.history[i].join(",");
	}
	save();
	location.reload();
}

function showHistory() {
	let modalFriend = document.body.appendChild(document.createElement("div"));
	modalFriend.setAttribute("class", "modal-friend");
	let modal = document.body.appendChild(document.createElement("div"));
	modal.setAttribute("class", "modal");
	let closeButton = modal.appendChild(document.createElement("button"));
	closeButton.setAttribute("class", "close-button");
	closeButton.innerText = "close";
	closeButton.onclick = function() {
		modalFriend.style.animation = "0.1s modal-friend-exit";
		modal.style.animation = "0.1s modal-exit";
		setTimeout(function(){
			modalFriend.remove();
			modal.remove();
		}, 100-5);
	};
	let resetButton = modal.appendChild(document.createElement("button"));
	resetButton.innerText = "permanently reset board";
	resetButton.setAttribute("class", "dangerous-button");
	resetButton.onclick = function() {
		if (confirm("Reset your board? This cannot be undone!")) hardReset();
	}
	let h1 = modal.appendChild(document.createElement("h1"));
	h1.innerText = "Play history";
	let tableHTML = "<tr><th>Date</th><th>Word</th><th>Points</th></tr>";
	for (let entry of metadata.history) {
		let [dateNumber, word, points] = entry.split(",");
		tableHTML += "<tr><td>" + dateNumberToDateText(parseInt(dateNumber)) + "</td><td>" + word + "</td><td>" + points + "</td></tr>";
	}
	let table = modal.appendChild(document.createElement("table"));
	table.innerHTML = tableHTML;
}

function updatePointCounter() {
	let sumPoints = 0;
	for (let entry of metadata.history) sumPoints += parseInt(entry.split(",")[2]);
	document.querySelector("#point-counter").innerText = sumPoints + plural(" pt.", " pts.", sumPoints);
}

/**

board[n] = Tile { //maybe make n significant? some significant mapping? idk
	x: 0,
	y: 0, //NO TWO THINGS CAN SHARE THE SAME COORDS
	letter: "A",
	date: 8714 // The number of days since january 1 2000. this is how i store what date everythingw as added, just for funsies
	dock: the dock it belongs to. alternative coords :3
	element: NOT stored, but useful while app is running :)
}

other info to be stored between sessions
- last tile pick : if not today, pick some tiles for today!!
- last submit date : destroy any tiles that are dated after this date but before today. those were never saved and never should be saved


**/