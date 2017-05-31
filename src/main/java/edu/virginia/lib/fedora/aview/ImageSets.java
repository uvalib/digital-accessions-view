package edu.virginia.lib.fedora.aview;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;
import org.fcrepo.client.FcrepoClient;
import org.fcrepo.client.FcrepoOperationFailedException;

import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonReader;
import javax.json.JsonValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Properties;

import static org.apache.jena.rdf.model.ModelFactory.createDefaultModel;
import static org.apache.jena.rdf.model.ResourceFactory.createProperty;
import static org.apache.jena.rdf.model.ResourceFactory.createResource;

@Path("")
public class ImageSets {

    final String PCDM_NS_URI = "http://pcdm.org/models#";
    final String ORE_NS_URI = "http://www.openarchives.org/ore/terms/";
    final String IANA_NS_URI = "http://www.iana.org/assignments/relation/";
    final Property PCDM_HAS_MEMBER = createProperty(PCDM_NS_URI, "hasMember");
    final Property RDF_TYPE = createProperty("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    final Property IMAGE_SET = createProperty("http://ontology.lib.virginia.edu/presentation#ImageSet");
    final Property ORE_PROXY = createProperty(ORE_NS_URI, "Proxy");
    final Property ORE_PROXY_FOR = createProperty(ORE_NS_URI, "proxyFor");
    final Property ORE_PROXY_IN = createProperty(ORE_NS_URI, "proxyIn");
    final Property IANA_FIRST = createProperty(IANA_NS_URI, "first");
    final Property IANA_LAST = createProperty(IANA_NS_URI, "last");
    final Property IANA_PREV = createProperty(IANA_NS_URI, "prev");
    final Property IANA_NEXT = createProperty(IANA_NS_URI, "next");

    @GET
    @Path("image-sets/find")
    public Response findImageSetsForBagId(@QueryParam("bagId") final String bagId) {
        final String sparqlQuery = "";
        return null;
    }


    /**
     * Accepts a JSON Array of identifiers (URIs) for which an image set should be created.
     * @param jsonInput an array of identifiers in json (ie, {@code  [ "http://uri1", "http://uri2", "http://uri3" ] })
     */
    @POST
    @Path("image-sets")
    public Response createImageSet(InputStream jsonInput) {
        JsonReader jsonReader = Json.createReader(jsonInput);
        JsonArray array = jsonReader.readArray();

        Model m = createDefaultModel();
        final Resource collection = createResource("");
        m.add(collection, RDF_TYPE, IMAGE_SET);
        for (int i = 0; i < array.size(); i ++) {
            JsonValue v = array.get(i);
            if (!v.getValueType().equals(JsonValue.ValueType.STRING)) {
                return Response.status(Response.Status.BAD_REQUEST).entity("Array must only contain Strings!").build();
            }
            final Resource fragment = createResource("#" + i);
            m.add(collection, PCDM_HAS_MEMBER, createResource(array.getString(i)));
            m.add(fragment, RDF_TYPE, ORE_PROXY);
            m.add(fragment, ORE_PROXY_FOR, createResource(array.getString(i)));
            m.add(fragment, ORE_PROXY_IN, collection);
            if (i == 0) {
                m.add(collection, IANA_FIRST, fragment);
            }
            if (i == array.size() -1) {
                m.add(collection, IANA_LAST, fragment);
            }
            if (i > 0) {
                final Resource previous = createResource("#" + (i - 1));
                m.add(fragment, IANA_PREV, previous);
                m.add(previous, IANA_NEXT, fragment);
            }
        }

        final ByteArrayOutputStream baos = new ByteArrayOutputStream();
        m.write(baos, "N3");

        // Post the content to fedora
        final Properties p = new Properties();
        final File configFile = new File("fcrepo-config.properties");
        try (FileInputStream fis = new FileInputStream(configFile)) {
            p.load(fis);
            FcrepoClient client = FcrepoClient.client().credentials(p.getProperty("username"), p.getProperty("password")).throwExceptionOnFailure().build();
            client.post(new URI(p.getProperty("container"))).body(new ByteArrayInputStream(baos.toByteArray()), "text/rdf+n3").perform();
        } catch (FileNotFoundException e) {
            Response.serverError().entity("Server is misconfigured!  Configuration file, \"" + configFile.toString() + "\" not found!");
        } catch (IOException | FcrepoOperationFailedException | URISyntaxException e) {
            e.printStackTrace();
            return Response.serverError().encoding(e.getMessage()).build();
        }
        return Response.ok().build();
    }

}