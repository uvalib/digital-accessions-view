var imageList = []; //Potentially non-unique file path shown to user
var uriList = []; //Unique URI sent to server

var duplicate = false; //Flag for duplicate images in selection
var editorVisible = false;
var imageSetId = "";
var imageSetUri = "";

/* Disables 'Add' buttons for files that aren't images,
loads image set if relevant, calls noImageCheck to
generate 'None' row, and shortens file paths if needed. */

function init() {
	var fileTableRows = document.getElementsByTagName('table')[0].getElementsByTagName('tr');
	
	for (var i = 1; i < fileTableRows.length; i++) {
		//shorten file path if longer than 40 characters
		if (fileTableRows[i].children[0].children[0] != null) {
			fileTableRows[i].children[0].children[0].innerHTML = trimFilePath(fileTableRows[i].children[0].children[0].innerHTML);
		} else {
			fileTableRows[i].children[0].innerHTML = trimFilePath(fileTableRows[i].children[0].innerHTML);
		}
		
		//condense file sizes
		var fileSize = parseInt(fileTableRows[i].children[1].innerHTML); //text in column 2
		if (!isNaN(fileSize)) {
			if (fileSize > 999999999) {
				fileTableRows[i].children[1].innerHTML = Math.round((fileSize / 1073741824) * 10) / 10 + "GB";
			} else if (fileSize > 999999) {
				fileTableRows[i].children[1].innerHTML = Math.round((fileSize / 1048576) * 10) / 10 + "MB";
			} else if (fileSize > 999) {
				fileTableRows[i].children[1].innerHTML = Math.round((fileSize / 1024) * 10) / 10 + "KB";
			} else {
				fileTableRows[i].children[1].innerHTML = Math.round(fileSize * 10) / 10 + "B";
			}
		}
		
		//disable 'Add' button if the row doesn't contain an image
		if (!fileTableRows[i].children[2].innerHTML.startsWith("image")) { //mime
			fileTableRows[i].children[3].children[0].removeAttribute('onclick');
			fileTableRows[i].children[3].children[0].setAttribute('class', 'disabled');
			fileTableRows[i].children[3].children[0].children[0].setAttribute('src', '/img/disabled.png');
		}
		
	}
	
	toggleSizeAndMime();
	
	document.getElementById('imageSetName').value = "";
	
	//check for edit variable in url
	if (window.location.href.indexOf("?edit") != -1) {
		imageSetId = window.location.href.substring(window.location.href.indexOf("?edit") + 6, window.location.href.indexOf("&imageSetUri"));
		imageSetUri = window.location.href.substring(window.location.href.indexOf("&imageSetUri") + 13);
		
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
				
				toggleCreator();
				
				document.getElementById('p').innerHTML = "";
			}
		}
		
		xhr.open("GET", "/accessions/image-sets/" + imageSetId, true);
		xhr.send();
		
		document.getElementById('p').innerHTML = "Working...";
		
	}
	
	//getNumberOfImageSets();
	noImageCheck();
}



/* Trims file path to 40 characters, maintaining file name */

function trimFilePath(filePath) {
	//shorten file path if longer than 40 characters
	if (filePath.length > 40) {
		var fileName;
		
		if (filePath.lastIndexOf("/") != -1) {
			fileName = filePath.substring(filePath.lastIndexOf("/"));
		} else {
			fileName = filePath;
		}
		
		//if we would chop file name
		if (fileName.length > 18 && fileName.length < 36) {
			//keep file name and first 36 - fileName.length characters
			filePath = filePath.substring(0, 36 - fileName.length) + "...." + filePath.substring(filePath.length - fileName.length);
		} else if (fileName.length >= 36) {
			//keep just file name
			filePath = "...." + fileName;
		} else {
			//keep first and last 18 characters
			filePath = filePath.substring(0, 18) + "...." + filePath.substring(filePath.length - 18);
		}
	}
	return filePath;
}



/* Toggles given 'Add' button on and off. */

function toggleAddButton(button) {
	if (button.className.includes("disabled")) {
		button.className = "imgButton addButton";
		button.setAttribute("onclick", button.getAttribute("onclick").substring(2)); //uncomment the onclick
		button.children[0].setAttribute('src', '/img/add.png');
	} else {
		button.className = "disabled";
		button.setAttribute("onclick", "//" + button.getAttribute("onclick"));
		button.children[0].setAttribute('src', '/img/disabled.png');
	}
}



/* Finds and toggles buttons with matching URIs. */

function toggleAddButtonFromURI(uri) {
	var fileTableRows = document.getElementsByTagName('table')[0].getElementsByTagName('tr');
	for (var i = 1; i < fileTableRows.length; i++) {
		//if the onclick of the row has a matching URI
		if (fileTableRows[i].children[3].children[0].getAttribute('onclick').includes(uri)) {
			toggleAddButton(fileTableRows[i].children[3].children[0]);
			break;
		}
	}
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
		
		populateRow(newRow, trimFilePath(img), uri);
		toggleAddButtonFromURI(uri);
		//checkDuplicates();
		noImageCheck();
		
		document.getElementById('p').innerHTML = "";
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
	
	toggleAddButtonFromURI(row.children[3].innerHTML);
	row.remove();
	//checkDuplicates();
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
	
	//checkDuplicates();
}



/* Adds all images to the selection */

function addAllImages() {
	var fileTableRows = document.getElementsByTagName('table')[0].getElementsByTagName('tr');
	for (var i = 1; i < fileTableRows.length; i++) {
		fileTableRows[i].children[3].children[0].click();
	}
}



/* Removes all images from the selection */

function removeAllImages() {
	var selectionTableRows = document.getElementById('selectionTable').getElementsByTagName('tr');
	var rows = selectionTableRows.length;
	for (var i = 1; i < rows - 1; i++) {
		selectionTableRows[1].children[2].children[0].click();
	}
}

/* Adds a "-None-" row to the selection table if empty and
calls disableCreateButton. */

function noImageCheck() {
	var table = document.getElementById('selectionTable');
	var createButton = document.getElementById('createButton');
	
	//if no files are selected
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



/* Disables the createButton if there is no selection, no name, or duplicates. */

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
	var imageSetName = document.getElementById('imageSetName').value.replace(/ /g, '_');
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
					if (!create) {
						document.getElementById('p').innerHTML = "Image set creation cancelled.";
					}
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
	if (uriList.length != 0 && document.getElementById('imageSetName').value !== "") {
		var table = document.getElementById('selectionTable');
		var imageSetName = document.getElementById('imageSetName').value.replace(/ /g, '_');
		
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
				document.getElementById('p').innerHTML = "Error: Status code " + this.status  + ".";
			} else if (xhr.readyState == 4 && this.status == 200) {
				for (i = 0; i < uriList.length; i++) {
					toggleAddButtonFromURI(table.children[0].children[1].children[3].innerHTML);
					table.children[0].children[1].remove();
				}
				uriList.length = 0;
				imageList.length = 0;
				document.getElementById('imageSetName').value = "";
				
				//checkDuplicates();
				noImageCheck();
				
				document.getElementById('p').innerHTML = "Image set saved successfully.";
			}
		}
		//send replace flag if needed
		if (imageSetId !== "" && imageSetId === imageSetName) {
			xhr.open("POST", "/accessions/image-sets?setId=" + imageSetUri, true);
			xhr.send(jsonObject);
		} else {
			xhr.open("POST", "/accessions/image-sets", true);
			xhr.send(jsonObject);
		}
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
	moveCell.setAttribute("class", "move");
	
	var topButton = document.createElement("div");
	topButton.setAttribute('class', 'imgButton topButton');
	topButton.setAttribute('onclick', 'moveRow(this, true, true)');
	topButton.title = "Move image to top";
	topButton.appendChild(document.createElement("img"));
	topButton.children[0].setAttribute('src', '/img/top.png');
	moveCell.appendChild(topButton);
	
	var upButton = document.createElement("div");
	upButton.setAttribute('class', 'imgButton upButton');
	upButton.setAttribute('onclick', 'moveRow(this, true, false)');
	upButton.title = "Move image up";
	upButton.appendChild(document.createElement("img"));
	upButton.children[0].setAttribute('src', '/img/up.png');
	moveCell.appendChild(upButton);
	
	moveCell.appendChild(document.createElement("br"));
	
	var bottomButton = document.createElement("div");
	bottomButton.setAttribute('class', 'imgButton bottomButton');
	bottomButton.setAttribute('onclick', 'moveRow(this, false, true)');
	bottomButton.title = "Move image to bottom";
	bottomButton.appendChild(document.createElement("img"));
	bottomButton.children[0].setAttribute('src', '/img/bottom.png');
	moveCell.appendChild(bottomButton);
	
	var downButton = document.createElement("div");
	downButton.setAttribute('class', 'imgButton downButton');
	downButton.setAttribute('onclick','moveRow(this, false, false)');
	downButton.title = "Move image down";
	downButton.appendChild(document.createElement("img"));
	downButton.children[0].setAttribute('src', '/img/down.png');
	moveCell.appendChild(downButton);
	
	//add text
	var textCell = newRow.insertCell();
	textCell.setAttribute("class", "selectedFiles");
	textCell.appendChild(document.createTextNode(img));
	
	//add button
	var buttonCell = newRow.insertCell();
	buttonCell.setAttribute("class", "remove");
	var removeButton = document.createElement('div');
	removeButton.setAttribute('class', 'imgButton removeButton');
	removeButton.setAttribute('onclick','removeRow(this)');
	removeButton.title = "Remove image from selection";
	removeButton.appendChild(document.createElement("img"));
	removeButton.children[0].setAttribute('src', '/img/remove.png');
	buttonCell.appendChild(removeButton);
	
	//store uri info in hidden cell
	var uriCell = newRow.insertCell();
	uriCell.innerHTML = uri;
	uriCell.style.display = "none";
}



/* Gets the number of image sets and places the number in a 'p' tag */

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
					"is currently <a href=\"" + url + "\">1 image set of this bag.</a>" :
					"are currently <a href=\"" + url + "\">" + Object.keys(imageSets).length + " image sets of this bag.</a>");
		}
	}
	
	xhr.open("GET", "/accessions/image-sets/find", true);
	xhr.send();
	
	document.getElementById('imageSetCount').innerHTML = "Fetching image set data...";
}



/* Called when clicking to edit image set. Loads image viewer 
with parameters in the URL to load the proper image set. */

function editImageSet(imageSetName, imageSetURI) {
	var url = window.location.href.substring(0, window.location.href.lastIndexOf("/")) + "?edit=" + imageSetName + "&imageSetUri=" + imageSetURI;
	window.location.href = url;
}



/* Hides or shows image set creation functionality. */

function toggleCreator() {
	editorVisible = !editorVisible;
	
	toggleSizeAndMime();
	
	var addColumn = document.getElementsByClassName("add");
	for (var i = 0; i < addColumn.length; i++) {
		addColumn[i].style.display = editorVisible ? "table-cell" : "none";
	}
	
	document.getElementById("viewerTitle").innerHTML = editorVisible ? "Image Set Creator" : "Bag Viewer";
	document.getElementById("editorDescription").style.display = editorVisible ? "block" : "none";
	document.getElementById("viewerButton").innerHTML = editorVisible ? "Hide Image Set Creator" : "Open Image Set Creator";
	document.getElementById("editorAddAll").style.display = editorVisible ? "inline" : "none";	
	document.getElementById("editorRemoveAll").style.display = editorVisible ? "inline" : "none";	
	document.getElementById("selectionTable").style.display = editorVisible ? "table" : "none";
}

window.onresize = function(e) {
	toggleSizeAndMime();
}



/* Hides or shows size and mime columns when needed. */

function toggleSizeAndMime() {
	var size = document.getElementsByClassName("size");
	var mime = document.getElementsByClassName("mime");
	for (var i = 0; i < size.length; i++) {
		size[i].style.display = window.innerWidth > 1125 || !editorVisible ? "table-cell" : "none";
		mime[i].style.display = window.innerWidth > 1125 || !editorVisible ? "table-cell" : "none";
	}
}