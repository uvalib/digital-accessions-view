var imageList = [];

function add(img) {
	imageList.push(img);
	var table = document.getElementById('selectionTable');
	var newRow = table.insertRow();
	
	var textCell = newRow.insertCell();
	textCell.appendChild(document.createTextNode(imageList[imageList.length - 1]));
	
	var buttonCell = newRow.insertCell();
	var removeButton = document.createElement('button');
	removeButton.type = 'button';
	removeButton.innerHTML = 'Remove';
	removeButton.onclick = remove; //does not show up in HTML but works
	buttonCell.appendChild(removeButton);
}

var remove = function() {
	document.getElementById('test').innerHTML = 'text';
}

function createImageSet() {
	
}