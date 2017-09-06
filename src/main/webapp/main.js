/* main.js - Used in UVA Library digital accessions viewer */

var imageList = []; //Potentially non-unique file path shown to user
var uriList = []; //Unique URI sent to server

var editorVisible = false;

var imageSetId = ""; //used when editing a previously-created image set
var imageSetUri = "";

//file table and individual cells
var ft, ftRows, ftPaths, ftThumbnails, ftSizes, ftMimes, ftAdds;

//selection table and individual cells
var st, stRows, stMoves, stPaths, stRemoves, stURIs;

var info; //paragraph tag used to display contextual information

var debugFlag = false; //manually change to 'true' to enable debug functionality



/* Disables 'Add' buttons for files that aren't images,
loads in image set if parameters are present,
shortens file paths if needed,
and calls noImageCheck to generate 'None' row. */

function init() {
	//define variables now that the page is loaded
	ft = document.getElementsByTagName('table')[0];
	ftRows = ft.getElementsByTagName('tr');
	ftPaths = ft.getElementsByClassName('file');
	ftThumbnails = ft.getElementsByClassName('thumbnail');
	ftSizes = ft.getElementsByClassName('size');
	ftMimes = ft.getElementsByClassName('mime');
	ftAdds = ft.getElementsByClassName('add');

	st = document.getElementsByTagName('table')[1];
	stRows = st.getElementsByTagName('tr');
	stMoves = st.getElementsByClassName('move');
	stPaths = st.getElementsByClassName('selectedFiles')
	stRemoves = st.getElementsByClassName('remove')
	stURIs = st.getElementsByClassName('uri');
	
	info = document.getElementById('info');
	
	for (var i = 1; i < ftRows.length; i++) { //i = 1 because first row is not data
		
		//shorten file path if needed
		if (ftPaths[i].children[0] != null) { //if path is a link
			ftPaths[i].children[0].innerHTML = trimFilePath(ftPaths[i].children[0].innerHTML);
		} else { //if path is not a link
			ftPaths[i].innerHTML = trimFilePath(ftPaths[i].innerHTML);
		}
		
		//condense displayed file size
		var fileSize = parseInt(ftSizes[i].innerHTML);
		if (!isNaN(fileSize)) {
			if (fileSize > 999999999) {
				ftSizes[i].innerHTML = Math.round((fileSize / 1073741824) * 10) / 10 + "GB";
			} else if (fileSize > 999999) {
				ftSizes[i].innerHTML = Math.round((fileSize / 1048576) * 10) / 10 + "MB";
			} else if (fileSize > 999) {
				ftSizes[i].innerHTML = Math.round((fileSize / 1024) * 10) / 10 + "KB";
			} else {
				ftSizes[i].innerHTML = Math.round(fileSize * 10) / 10 + "B";
			}
		}
		
		//if item isn't an image disable 'Add' button
		if (!ftMimes[i].innerHTML.startsWith("image")) {
			ftAdds[i].children[0].removeAttribute('onclick');
			ftAdds[i].children[0].setAttribute('class', 'disabled');
			ftAdds[i].children[0].children[0].setAttribute('src', '/img/disabled.png');
		}
		
	}
	
	document.getElementById('imageSetName').value = ""; //keep browser from filling in cached value
	
	//load image set if parameters are present
	var parameters = getParameters();
	if (parameters !== null
			&& parameters.get("edit") !== undefined
			&& parameters.get("imageSetUri") !== undefined) {
		imageSetId = parameters.get("edit");
		imageSetUri = parameters.get("imageSetUri");
		
		//get image set for the given id, load images into table
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && this.status != 200) { //failure
				info.innerHTML = "Error retrieving image set: Status code " + this.status  + ".";
			} else if (xhr.readyState == 4 && this.status == 200) { //success
				var images = JSON.parse(xhr.responseText);
				document.getElementById('imageSetName').value = decodeURI(imageSetId);
				
				for (var i = 0; i < images.length; i++) {
					addRow(images[i]["filename"].toString(), images[i]["uri"].toString(), images[i]["mimetype"].toString());
				}
				
				window.history.pushState("state", "", window.location.href.substring(0, window.location.href.indexOf("?"))); //trim off parameters so this doesn't trigger again if refreshed
				
				toggleCreator();
				info.innerHTML = "";
			}
		}
		
		xhr.open("GET", "/accessions/image-sets/" + imageSetId, true);
		xhr.send();
		
		info.innerHTML = "Working...";
	}
	
	noImageCheck(); //initially generate "-None-" row
}



/* Trims file path to 'maxLength' characters, maintaining file name. */

function trimFilePath(filePath, maxLength = 40) {
	//shorten file path if longer than maxLength characters
	if (filePath.length > maxLength) {
		var fileName;
		
		if (filePath.lastIndexOf("/") != -1) {
			fileName = filePath.substring(filePath.lastIndexOf("/"));
		} else {
			fileName = filePath;
		}
		
		//if we would chop file name
		if (fileName.length > Math.round((maxLength - 4) / 2) && fileName.length < maxLength - 4) {
			//keep file name and first maxLength - 4 - fileName.length characters
			filePath = filePath.substring(0, maxLength - 4 - fileName.length) + "...." + filePath.substring(filePath.length - fileName.length);
		} else if (fileName.length >= maxLength - 4) {
			//keep just file name
			filePath = "...." + fileName;
		} else {
			//keep first and last Math.round((maxLength - 4) / 2) characters
			filePath = filePath.substring(0, Math.round((maxLength - 4) / 2)) + "...." + filePath.substring(filePath.length - Math.round((maxLength - 4) / 2));
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



/* Finds and toggles 'Add' buttons with matching URIs. */

function toggleAddButtonFromURI(uri) {
	for (var i = 1; i < ftRows.length; i++) {
		//if the onclick of the row has a matching URI
		if (ftAdds[i].children[0].getAttribute('onclick').includes(uri)) {
			toggleAddButton(ftAdds[i].children[0]);
			break;
		}
	}
}



/* Returns a map of parameters in the URL, or null if there are none. */

function getParameters() {
	var url = window.location.href;
	if (url.indexOf("?") != -1) {
		var parameters = new Map();
		var urlParameters = url.substring(url.indexOf("?") + 1).split("&");
		for (var i = 0; i < urlParameters.length; i++) {
			parameters.set(urlParameters[i].split("=")[0], urlParameters[i].split("=")[1]);
		}
		return parameters;
	}
	return null;
}


/* Adds a row to the selection table with the specified image. */

function addRow(img, uri, mime) {
	if (mime.startsWith("image")) {
		//update arrays
		imageList.push(img);
		uriList.push(uri);
		
		//create row
		var newRow = st.insertRow(st.getElementsByTagName("tr").length - 1);
		
		populateRow(newRow, trimFilePath(img), uri);
		toggleAddButtonFromURI(uri);
		noImageCheck();
		
		info.innerHTML = "";
	} else {
		alert("Error: File is not an image.");
	}
}



/* Removes the row containing the calling button and removes
the corresponding array entries. */

function removeRow(button) {
	var row = button.parentNode.parentNode;
	
	//get index of row
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
	noImageCheck();
}



/* Moves the calling button's row up or down, either by one or to the end.
'up' and 'end' are booleans. */

function moveRow(button, up, end) {
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
			var newRow = st.insertRow(1);
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
			var newRow = st.insertRow(st.getElementsByTagName("tr").length - 1);
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
			var newRow = st.insertRow(index);
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
			var newRow = st.insertRow(index + 3);
			populateRow(newRow, row.children[1].innerHTML, row.children[3].innerHTML);
			row.remove();
		}
	}
	debug(); //only has an effect if 'debugFlag' is manually set
}



/* Adds all images to the selection */

function addAllImages() {
	for (var i = 1; i < ftRows.length; i++) {
		ftAdds[i].children[0].click();
	}
}



/* Removes all images from the selection */

function removeAllImages() {
	var rows = stRows.length;
	for (var i = 1; i < rows - 1; i++) {
		stRemoves[1].children[0].click();
	}
}

/* Adds a "-None-" row to the selection table if empty and
calls disableCreateButton. */

function noImageCheck() {
	var createButton = document.getElementById('createButton');
	
	
	if (stRows.length == 2) { //if no files are selected
		//add "-None-" indication row
		var noneRow = st.insertRow(stRows.length - 1);
		
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
	debug(); //only has an effect if 'debugFlag' is manually set
}



/* Disables the createButton if there is no selection or no name. */

function disableCreateButton() {
	var createButton = document.getElementById('createButton');
	var imageSetName = document.getElementById('imageSetName');
	
	if (document.getElementById('noneRow') !== null || imageSetName.value === "") {
		createButton.disabled = true;
	} else {
		createButton.disabled = false;
	}
}



/* Checks availability of image set name before calling createImageSet */

function checkName() {
	var imageSetName = encodeURI(document.getElementById('imageSetName').value);
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
						info.innerHTML = "Image set creation cancelled.";
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
	info.innerHTML = "Processing...";
}



/* Sends uriList to server as a string for image set creation. */

function createImageSet() {
	if (uriList.length != 0 && document.getElementById('imageSetName').value !== "") {
		var imageSetName = encodeURI(document.getElementById('imageSetName').value);
		
		var jsonObject = JSON.stringify({"name":imageSetName,"uriList":uriList})
		
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && this.status != 200) { //failure
				alert("Error: Status code " + this.status + ", ready state " + xhr.readyState + ".");
				info.innerHTML = "Error: Status code " + this.status  + ".";
			} else if (xhr.readyState == 4 && this.status == 200) { //success
				for (i = 0; i < uriList.length; i++) {
					toggleAddButtonFromURI(stURIs[0].innerHTML);
					stRows[1].remove();
				}
				uriList.length = 0;
				imageList.length = 0;
				document.getElementById('imageSetName').value = "";
				
				noImageCheck();
				
				info.innerHTML = "Image set saved successfully.";
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
			info.innerHTML = "Error: Selection is empty.";
		} else {
			alert("Error: Image set name is empty.");
			info.innerHTML = "Error: Image set name is empty.";
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
	uriCell.setAttribute('class', 'uri');
	uriCell.style.display = "none";
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
	
	toggleFullView();
	
	for (var i = 0; i < ftAdds.length; i++) {
		ftAdds[i].style.display = editorVisible ? "table-cell" : "none";
	}
	
	document.getElementById("viewerTitle").innerHTML = editorVisible ? "Image Set Creator" : "Bag Viewer";
	document.getElementById("editorDescription").style.display = editorVisible ? "block" : "none";
	document.getElementById("viewerButton").innerHTML = editorVisible ? "Hide Image Set Creator" : "Open Image Set Creator";
	document.getElementById("editorAddAll").style.display = editorVisible ? "inline" : "none";	
	document.getElementById("editorRemoveAll").style.display = editorVisible ? "inline" : "none";	
	document.getElementById("selectionTable").style.display = editorVisible ? "table" : "none";
}



/* Calls toggleFullView on window resize. */

window.onresize = function(e) {
	toggleFullView();
}



/* Hides or shows size and mime columns when needed. */

function toggleFullView() {
	for (var i = 0; i < ftSizes.length; i++) {
		ftSizes[i].style.display = window.innerWidth > 1110 || !editorVisible ? "table-cell" : "none";
		ftMimes[i].style.display = window.innerWidth > 1110 || !editorVisible ? "table-cell" : "none";
	}
}



/* Creates an overlay displaying an enlarged thumbnail
of the passed image. */

function enlargeThumbnail(image) {
	var thumbnailUrl = image.getAttribute("src").replace("!32,32", "!512,512");
	
	var overlayDiv = document.createElement("div");
	overlayDiv.setAttribute("class", "overlayBackground");
	overlayDiv.setAttribute("onclick", "this.remove()");
	
	var bigImage = document.createElement("img");
	bigImage.setAttribute("class", "overlayImage");
	bigImage.setAttribute("src", thumbnailUrl);
	
	overlayDiv.appendChild(bigImage);
	document.body.appendChild(overlayDiv);
}



/* Prints contents of imageList to p tag for debugging. */

function debug() {
	if (debugFlag) {
		document.getElementById("debug").innerHTML = "";
		for (var i = 0; i < imageList.length; i++) {
			document.getElementById("debug").innerHTML += imageList[i] + "<br>";
		}
	}
}