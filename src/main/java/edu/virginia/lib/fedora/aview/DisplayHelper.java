package edu.virginia.lib.fedora.aview;

/**
 * Created by md5wz on 4/12/17.
 */
public class DisplayHelper {

    public String uriToId(final String uri) {
        return uri.substring(uri.lastIndexOf('/') + 1);
    }

}
