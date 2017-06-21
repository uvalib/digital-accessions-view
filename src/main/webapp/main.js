var imageList = []; //Potentially non-unique file path shown to user
var uriList = []; //Unique URI sent to server

var duplicate = false; //Flag for duplicate images in selection

/* Disables 'Add' buttons for files that aren't images,
loads image set if relevant, and calls noImageCheck
to generate 'None' row. */

function init() {
	var fileTableRows = document.getElementsByTagName('table')[0].getElementsByTagName('tr');
	for (i = 1; i < fileTableRows.length; i++) {
		if (!fileTableRows[i].children[2].innerHTML.startsWith("image")) { //mime
			fileTableRows[i].children[3].children[0].disabled = true;
		}
	}
	
	document.getElementById('imageSetName').value = "";
	
	//check for edit variable in url
	if (window.location.href.indexOf("?edit") != -1) {
		var imageSetId = window.location.href.substring(window.location.href.indexOf("?edit") + 6);
		//get image set for id, load images into table
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && this.status != 200) {
				document.getElementById('p').innerHTML = "Error retrieving image set: Status code " + this.status  + ".";
			} else if (xhr.readyState == 4 && this.status == 200) {
				var images = JSON.parse(xhr.responseText);
				document.getElementById('imageSetName').value = imageSetId;
				
				//only does one pass unless delcared with "var i"
				for (var i = 0; i < images.length; i++) {
					addRow(images[i]["filename"].toString(), images[i]["uri"].toString(), images[i]["mimetype"].toString());
				}
				
				window.history.pushState("state", "", window.location.href.substring(0, window.location.href.indexOf("?"))); //trim off variable
				
				document.getElementById('p').innerHTML = "Loaded image set.";
			}
		}
		
		xhr.open("GET", "/accessions/image-sets/" + imageSetId, true);
		xhr.send();
		
		document.getElementById('p').innerHTML = "Working...";
		
	}
	
	getNumberOfImageSets();
	noImageCheck();
}



/* Adds a row to the selection table with the specified image. */

function addRow(img, uri, mime) {
	if (mime.startsWith("image")) {
		//update arrays
		imageList.push(img);
		uriList.push(uri);
		
		//create row
		var table = document.getElementById('selectionTable');
		var newRow = table.insertRow(table.getElementsByTagName("tr").length - 1);
		
		populateRow(newRow, img, uri);
		checkDuplicates();
		noImageCheck();
	} else {
		alert("Error: File is not an image.");
	}
}



/* Removes the row containing the calling button and removes
the corresponding imageList and uriList entries. */

function removeRow(button) {
	var row = button.parentNode.parentNode;
	
	var currentRow = row;
	var index = -2; //-1 because the first row is the header. -2 because tbody?
	while (currentRow.previousSibling != null) {
		currentRow = currentRow.previousSibling;
		index++;
	}
	
	uriList.splice(index, 1);
	imageList.splice(index, 1);
	
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
	var index = -2; //-1 because the first row is the header. -2 because tbody?
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



/* Adds a "-None-" row to the selection table if empty and
calls disableCreateButton. */

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
	} else {
		//remove "-None-" row
		if (document.getElementById('noneRow') != null) {
			document.getElementById('noneRow').remove();
		}
	}
	
	disableCreateButton();
}



/* Disables the createButton if there is no selection or no name. */

function disableCreateButton() {
	var table = document.getElementById('selectionTable');
	var createButton = document.getElementById('createButton');
	var imageSetName = document.getElementById('imageSetName');
	
	if (document.getElementById('noneRow') != null || imageSetName.value === "" ||
			duplicate) {
		createButton.disabled = true;
	} else {
		createButton.disabled = false;
	}
}



/* Checks availability of image set name before calling createImageSet */

function checkName() {
	var imageSetName = document.getElementById('imageSetName').value.replace(" ", "_");
	
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && this.status != 200) {
			document.getElementById('imageSetCount').innerHTML = "Error retrieving image sets: Status code " + this.status  + ".";
		} else if (xhr.readyState == 4 && this.status == 200) {
			var imageSets = JSON.parse(xhr.responseText);
			var create = true;
			for (i = 0; i < imageSets.length; i++) {
				if (imageSets[i]["id"] === imageSetName) {
					create = confirm("An image set named \"" + imageSetName +
							"\" already exists. Press 'OK' to overwrite.");
					document.getElementById('p').innerHTML = "Image set creation cancelled.";
					break;
				}
			}
			if (create) {
				createImageSet();
			}
		}
	}
	xhr.open("GET", "/accessions/image-sets/find", true);
	xhr.send();
	document.getElementById('p').innerHTML = "Processing...";
}



/* Sends uriList to server as a string for image set creation. */

function createImageSet() {
	if (uriList.length != 0 && document.getElementById('imageSetName').value !== "" && !duplicate) {
		var table = document.getElementById('selectionTable');
		var imageSetName = document.getElementById('imageSetName').value.replace(" ", "_");
		
		//convert array to string
		var uriString = "[ ";
		for (i = 0; i < uriList.length; i++) {
			uriString += "\"" + uriList[i] + "\", ";
		}
		uriString = uriString.slice(0, -2) + " ]";

		var jsonObject = JSON.stringify({"name":imageSetName,"uriList":uriList})

		//create AJAX server request
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && this.status != 200) {
				alert("Error: Status code " + this.status + ", ready state " + xhr.readyState + ".");
				document.getElementById('p').innerHTML = "Error: Status code " +this.status  + ".";
			} else if (xhr.readyState == 4 && this.status == 200) {
				for (i = 0; i < uriList.length; i++) {
					table.children[0].children[1].remove();
				}
				uriList.length = 0;
				imageList.length = 0;
				document.getElementById('imageSetName').value = "";
				
				setTimeout(function(){getNumberOfImageSets();}, 7500); //server takes time to update
				checkDuplicates();
				noImageCheck();
				
				document.getElementById('p').innerHTML = "Image set saved successfully.";
			}
		}
		
		xhr.open("POST", "/accessions/image-sets", true);
		xhr.send(jsonObject);
	} else {
		if (uriList.length == 0) {
			alert("Error: Selection is empty.");
			document.getElementById('p').innerHTML = "Error: Selection is empty.";
		} else if (duplicate) {
			alert("Error: Image selection contains duplicates.");
			document.getElementById('p').innerHTML = "Error: Image selection contains duplicates";
		} else {
			alert("Error: Image set name is empty.");
			document.getElementById('p').innerHTML = "Error: Image set name is empty.";
		}
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
	var p = document.getElementById('p');
	
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
		
		duplicate = true;
		p.innerHTML = "Warning: " + duplicates.length +
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
		
		duplicate = false;
		p.innerHTML = "";
	}
}

function getNumberOfImageSets() {
	//create AJAX server request
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && this.status != 200) {
			document.getElementById('imageSetCount').innerHTML = "Error retrieving image sets: Status code " +this.status  + ".";
		} else if (xhr.readyState == 4 && this.status == 200) {
			var imageSets = JSON.parse(xhr.responseText);
			var url = (window.location.href.indexOf("?") == -1 ? window.location.href : window.location.href.substring(0, window.location.href.indexOf("?"))) + "/imageSets";
			
			document.getElementById('imageSetCount').innerHTML = "There " +
					(Object.keys(imageSets).length == 1 ?
					"is currently <a href=\"" + url + "\">1 image set of the current bag.</a>" :
					"are currently <a href=\"" + url + "\">" + Object.keys(imageSets).length + " image sets of the current bag.</a>");
		}
	}
	
	xhr.open("GET", "/accessions/image-sets/find", true);
	xhr.send();
	
	document.getElementById('imageSetCount').innerHTML = "Fetching image set data...";
}

function editImageSet(imageSetName) {
	var url = window.location.href.substring(0, window.location.href.lastIndexOf("/")) + "?edit=" + imageSetName;
	window.location.href = url;
}