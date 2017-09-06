package edu.virginia.lib.fedora.aview;

/**
 * Created by md5wz on 4/12/17.
 */
public class DisplayHelper {

    public String uriToId(final String uri) {
        return uri.substring(uri.lastIndexOf('/') + 1);
    }

    public String iiifThumbnail(final String serviceUrl, int size) {
    	
    	if (!serviceUrl.contains("/info.json")) {
    		return "";
    	}
    	final String root = serviceUrl.substring(0, serviceUrl.lastIndexOf("/info.json"));
        return root + "/full/!" + size + "," + size + "/0/default.jpg";
    }

}
