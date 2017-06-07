package edu.virginia.lib.fedora.aview;

import org.apache.commons.io.FileUtils;
import org.apache.http.client.utils.URIBuilder;

import javax.ws.rs.core.UriInfo;
import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.net.URL;

/**
 * An abstract base class for web service classes that encapsualtes logic for determining the
 * URLs of external services such as Fuseki and Fedora.
 */
public abstract class AbstractWebResource {

    private FusekiReader fusekiReader;

    private URL url;

    protected AbstractWebResource() {
        try {
            url = new URL (FileUtils.readFileToString(new File("host.txt"), "UTF-8"));
        } catch (IOException e) {
            System.out.println("Error reading from host.txt, " + (e.getMessage() != null ? e.getMessage() : ""));
            url = null;
        }
    }

    protected String getASpaceURI(UriInfo uriInfo) {
        try {
            return new URIBuilder()
                    .setHost(url == null ? uriInfo.getRequestUri().getHost() : url.getHost())
                    .setScheme(uriInfo.getRequestUri().getScheme())
                    .setPort(uriInfo.getRequestUri().getPort())
                    .setPath("/fcrepo/rest/aspace").build().toString();
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }

    protected FusekiReader getTriplestore(UriInfo uriInfo) {
        if (fusekiReader == null) {
            try {
                fusekiReader = new FusekiReader(new URIBuilder()
                        .setHost(url == null ? uriInfo.getRequestUri().getHost() : url.getHost())
                        .setScheme(uriInfo.getRequestUri().getScheme())
                        .setPort(uriInfo.getRequestUri().getPort())
                        .setPath("/fuseki/fcrepo").build().toString());
            } catch (URISyntaxException e) {
                throw new RuntimeException(e);
            }
        }
        return fusekiReader;
    }
}
