/* imageSets.js */



/* Decodes image set names, which are delivered URL-encoded. */

function init() {
	var setNameCells = document.getElementsByClassName("imageSetName");
	
	for (var i = 0; i < setNameCells.length; i++) {
		setNameCells[i].innerHTML = decodeURI(setNameCells[i].innerHTML);
	}
}



/* Called when clicking to edit image set. Loads image viewer 
with parameters in the URL to load the proper image set. */

function editImageSet(imageSetName, imageSetURI) {
	var url = window.location.href;
	var newUrl = url.substring(0, url.lastIndexOf("/")) + "?edit=" + imageSetName + "&imageSetUri=" + imageSetURI;
	window.location.href = newUrl;
}