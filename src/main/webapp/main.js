var imageList = [];

/* Adds a row to the selection table with the specified image. */

function add(img) {
	imageList.push(img);
	var table = document.getElementById('selectionTable');
	var newRow = table.insertRow(table.getElementsByTagName("tr").length - 1);
	
	var textCell = newRow.insertCell();
	textCell.appendChild(document.createTextNode(imageList[imageList.length - 1]));
	
	var buttonCell = newRow.insertCell();
	var removeButton = document.createElement('button');
	removeButton.type = 'button';
	removeButton.innerHTML = 'Remove';
	var attribute = document.createAttribute('onclick');
	attribute.value = "remove(this)";
	removeButton.setAttributeNode(attribute);
	buttonCell.appendChild(removeButton);
	
	noImageCheck();
}

/* Removes the row containing the calling button and removes
the corresponding imageList entry. */

function remove(object) {
	var row = object.parentNode.parentNode;
	
	var content = row.nextSibling.innerHTML;
	
	for (i = 0; i < imageList.length; i++) {
		if (imageList[i] == content) {
			imageList.splice(i, 1);
			break;
		}
	}
	
	row.remove();
	noImageCheck();
}

/* Adds a "-None-" row to the selection table if there are no
selected images. */

function noImageCheck() {
	var table = document.getElementById('selectionTable');
	
	if (table.getElementsByTagName("tr").length == 2) {
		var noneRow = table.insertRow(table.getElementsByTagName("tr").length - 1);
		
		var textCell = noneRow.insertCell();
		textCell.appendChild(document.createTextNode("-None-"));
		textCell.colSpan = "2";
		textCell.style.textAlign = "center";
		
		noneRow.appendChild(textCell);
		noneRow.id = "noneRow";
	} else {
		document.getElementById("noneRow").remove();
	}
}

function createImageSet() {
	
}