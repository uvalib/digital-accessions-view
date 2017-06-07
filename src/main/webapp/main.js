var imageList = []; //Potentially non-unique file path shown to user
var uriList = []; //Unique URI sent to server



/* Adds a row to the selection table with the specified image. */

function addRow(img, uri) {
	//update arrays
	imageList.push(img);
	uriList.push(uri);
	
	//create row
	var table = document.getElementById('selectionTable');
	var newRow = table.insertRow(table.getElementsByTagName("tr").length - 1);
	
	populateRow(newRow, img, uri);
	checkDuplicates();
	noImageCheck();
}



/* Removes the row containing the calling button and removes
the corresponding imageList and uriList entries. */

function removeRow(button) {
	var row = button.parentNode.parentNode;
	
	var uri = button.parentNode.nextSibling.innerHTML;
	
	for (i = 0; i < uriList.length; i++) {
		if (uriList[i] == uri) {
			uriList.splice(i, 1);
			imageList.splice(i, 1);
			break;
		}
	}
	
	row.remove();
	checkDuplicates();
	noImageCheck();
}



/* Moves the calling button's row up or down, either by one or to the end.
up and end are booleans. */

function moveRow(button, up, end) {
	var table = document.getElementById('selectionTable');
	var row = button.parentNode.parentNode;
	
	//get index of row
	var currentRow = row;
	var index = -2; //-1 because the first row is the header. -2 because... magic.
	while (currentRow.previousSibling != null) {
		currentRow = currentRow.previousSibling;
		index++;
	}
	
	//to top/bottom
	if (end) {
		//to top
		if (up) {
			//update arrays
			uriList.splice(0, 0, uriList[index]);
			uriList.splice(index + 1, 1);
			imageList.splice(0, 0, imageList[index]);
			imageList.splice(index + 1, 1);
			
			//move the row
			var newRow = table.insertRow(1);
			populateRow(newRow, row.children[1].innerHTML, row.children[3].innerHTML);
			row.remove();
		//to bottom
		} else {
			//update arrays
			uriList.splice(uriList.length, 0, uriList[index]);
			uriList.splice(index, 1);
			imageList.splice(imageList.length, 0, imageList[index]);
			imageList.splice(index, 1);
			
			//move the row
			var newRow = table.insertRow(table.getElementsByTagName("tr").length - 1);
			populateRow(newRow, row.children[1].innerHTML, row.children[3].innerHTML);
			row.remove();
		}
	//up/down one
	} else {
		//up one
		if (up && index != 0) {
			//update arrays
			uriList.splice(index - 1, 0, uriList[index]);
			uriList.splice(index + 1, 1);
			imageList.splice(index - 1, 0, imageList[index]);
			imageList.splice(index + 1, 1);
			
			//move the row
			var newRow = table.insertRow(index);
			populateRow(newRow, row.children[1].innerHTML, row.children[3].innerHTML);
			row.remove();
		//down one
		} else if (!up && index != imageList.length - 1) {
			//update arrays
			uriList.splice(index + 2, 0, uriList[index]);
			uriList.splice(index, 1);
			imageList.splice(index + 2, 0, imageList[index]);
			imageList.splice(index, 1);
			
			//move the row
			var newRow = table.insertRow(index + 3);
			populateRow(newRow, row.children[1].innerHTML, row.children[3].innerHTML);
			row.remove();
		}
	}
	
	checkDuplicates();
}



/* Adds a "-None-" row to the selection table and disables
"Create Image Set" button if there are no selected images. */

function noImageCheck() {
	var table = document.getElementById('selectionTable');
	var createButton = document.getElementById('createButton');
	
	//if selection is empty
	if (table.getElementsByTagName("tr").length == 2) {
		//add "-None-" indication row
		var noneRow = table.insertRow(table.getElementsByTagName("tr").length - 1);
		
		var textCell = noneRow.insertCell();
		textCell.appendChild(document.createTextNode("-None-"));
		textCell.colSpan = "3";
		textCell.style.textAlign = "center";
		
		noneRow.appendChild(textCell);
		noneRow.id = "noneRow";
		
		//disable "Create Image Set" button
		createButton.disabled = true;
	} else {
		//remove "-None-" row
		document.getElementById("noneRow").remove();
		
		//enable "Create Image Set" button
		createButton.disabled = false;
	}
}



/* Sends uriList to server as a string for image set creation. */

function createImageSet() {
	if (uriList.length != 0) {
		//convert array to string
		var uriString = "[ ";
		for (i = 0; i < uriList.length; i++) {
			uriString += "\"" + uriList[i] + "\", ";
		}
		uriString = uriString.slice(0, -2) + " ]";
		
		//create AJAX server request
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && this.status != 200) {
				alert("Error: Status code " + this.status + ", ready state " + xhr.readyState + ".");
			}
		}
		
		xhr.open("POST", "/accessions/image-sets", true);
		xhr.send(uriString);
	} else {
		alert("Error: uriList is empty; no data to send.");
	}
}



/* Fills a newly created row with required cells. */

function populateRow(newRow, img, uri) {
	//add movement buttons
	var moveCell = newRow.insertCell();
	
	var topButton = document.createElement("button");
	topButton.innerHTML = "&uarr;&uarr;";
	var attribute = document.createAttribute('onclick');
	attribute.value = "moveRow(this, true, true)";
	topButton.setAttributeNode(attribute);
	topButton.title = "Move image to top";
	moveCell.appendChild(topButton);
	
	var upButton = document.createElement("button");
	upButton.innerHTML = "&uarr;";
	attribute = document.createAttribute('onclick');
	attribute.value = "moveRow(this, true, false)";
	upButton.setAttributeNode(attribute);
	upButton.title = "Move image up";
	moveCell.appendChild(upButton);
	
	moveCell.appendChild(document.createElement("br"));
	
	var bottomButton = document.createElement("button");
	bottomButton.innerHTML = "&darr;&darr;";
	attribute = document.createAttribute('onclick');
	attribute.value = "moveRow(this, false, true)";
	bottomButton.setAttributeNode(attribute);
	bottomButton.title = "Move image to bottom";
	moveCell.appendChild(bottomButton);
	
	var downButton = document.createElement("button");
	downButton.innerHTML = "&darr;";
	attribute = document.createAttribute('onclick');
	attribute.value = "moveRow(this, false, false)";
	downButton.setAttributeNode(attribute);
	downButton.title = "Move image down";
	moveCell.appendChild(downButton);
	
	//add text
	var textCell = newRow.insertCell();
	textCell.appendChild(document.createTextNode(img));
	
	//add button
	var buttonCell = newRow.insertCell();
	var removeButton = document.createElement('button');
	removeButton.type = 'button';
	removeButton.innerHTML = 'Remove';
	attribute = document.createAttribute('onclick');
	attribute.value = "removeRow(this)";
	removeButton.setAttributeNode(attribute);
	removeButton.title = "Remove image from selection";
	buttonCell.appendChild(removeButton);
	
	//store uri info in hidden cell
	var uriCell = newRow.insertCell();
	uriCell.innerHTML = uri;
	uriCell.style.display = "none";
	
	var duplicateCell = newRow.insertCell();
	duplicateCell.style.display = "none";
}



/* Checks for duplicate URIs and highlights their rows if found. */

function checkDuplicates() {
	var duplicates = [];
	var current;
	var exemptList = [];
	var duplicateWarning = document.getElementById('duplicateWarning');
	
	//go through all rows
	for (i = 0; i < uriList.length; i++) {
		
		//check if rows i and j are duplicates
		var current = [i];
		for (j = i + 1; j < uriList.length; j++) {
			
			//check if j has been marked as a duplicate before
			var exempt = false;
			for (k = 0; k < exemptList.length; k++) {
				if (exemptList[k] == j) {
					exempt = true;
				}
			}
			
			if (uriList[i] == uriList[j] && !exempt) {
				current.push(j);
			}
		}
		
		if (current.length != 1) {
			duplicates.push(current);
			//exempt uris from additional for loop passes
			for (j = 0; j < current.length; j++) {
				exemptList.push(current[j]);
			}
		}
	}
	
	if (duplicates.length > 0) {
		//for all rows, if row number matches duplicate, insert index of duplicate
		var table = document.getElementById('selectionTable');
		
		table.children[0].children[0].children[3].style.display = "table-cell";
		
		//for every row
		for (i = 1; i < table.children[0].children.length - 1; i++) {
			var proc = false;
			var cell = table.children[0].children[i].lastChild;
			
			cell.style.display = "table-cell";
			
			//for every set of duplicates
			for (j = 0; j < duplicates.length; j++) {
				//for every duplicate
				for (k = 0; k < duplicates[j].length; k++) {
					if (duplicates[j][k] == i - 1) {
						cell.innerHTML = j + 1;
						proc = true;
					} //if 'if' never procs then remove the cell.
				}
			}
			
			if (!proc) {
				cell.innerHTML = "";
			}
		}
		
		duplicateWarning.innerHTML = "Warning: " + duplicates.length +
				(duplicates.length == 1 ? " set " : " sets ") +
				"of duplicates detected.";
	} else {
		//hide duplicate cells
		var table = document.getElementById('selectionTable');
		
		table.children[0].children[0].children[3].style.display = "none";
		
		for (i = 1; i < table.children[0].children.length - 1; i++) {
			var cell = table.children[0].children[i].lastChild;
			cell.style.display = "none";
		}
		
		duplicateWarning.innerHTML = "";
	}
}