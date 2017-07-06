package edu.virginia.lib.fedora.aview;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.apache.velocity.Template;
import org.apache.velocity.VelocityContext;
import org.apache.velocity.app.VelocityEngine;
import org.apache.velocity.runtime.RuntimeConstants;
import org.apache.velocity.runtime.resource.loader.ClasspathResourceLoader;
import org.fcrepo.client.FcrepoClient;
import org.fcrepo.client.FcrepoOperationFailedException;

import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import javax.json.JsonReader;
import javax.json.JsonValue;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringWriter;
import java.math.BigInteger;
import java.net.URI;
import java.net.URISyntaxException;
import java.security.SecureRandom;
import java.text.SimpleDateFormat;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import static org.apache.jena.rdf.model.ModelFactory.createDefaultModel;
import static org.apache.jena.rdf.model.ResourceFactory.createProperty;
import static org.apache.jena.rdf.model.ResourceFactory.createResource;
import static org.apache.jena.rdf.model.ResourceFactory.createStringLiteral;

@Path("")
public class ImageSets extends AbstractWebResource {


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
    final Property DC_ID = createProperty("http://purl.org/dc/terms/identifier");

    private FcrepoClient client;

    private FusekiReader fusekiReader;

    private URI imageSetContainer;
    
    private Template imageSetsTemplate;

    public ImageSets() throws IOException {
        final Properties p = new Properties();
        final File configFile = new File("fcrepo-config.properties");
        try (FileInputStream fis = new FileInputStream(configFile)) {
            p.load(fis);
            imageSetContainer = new URI(p.getProperty("container"));
            client = FcrepoClient.client().credentials(p.getProperty("username"), p.getProperty("password")).throwExceptionOnFailure().build();
        } catch (FileNotFoundException e) {
            throw new RuntimeException("Server is misconfigured!  Configuration file, \"" + configFile.toString() + "\" not found!");
        } catch (URISyntaxException e) {
            e.printStackTrace();
        }

        try {
        	
            if (FcrepoClient.client().credentials(p.getProperty("username"), p.getProperty("password")).build().head(imageSetContainer).perform().getStatusCode() == 404) {
                System.out.println("Unable to find image set container, creating a new one!");
                client.put(imageSetContainer).perform();
            }
        } catch (FcrepoOperationFailedException e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }

        VelocityEngine ve = new VelocityEngine();
        ve.setProperty(RuntimeConstants.RESOURCE_LOADER, "classpath");
        ve.setProperty("classpath.resource.loader.class", ClasspathResourceLoader.class.getName());
        ve.init();
        
        imageSetsTemplate = ve.getTemplate("imageSets.vm");
    }

    @GET
    @Produces("application/json")
    @Path("image-sets")
    public Response listAllImageSets(@Context UriInfo uriInfo, @Context HttpServletRequest request) throws IOException {
        return findImageSetsForBagId(null, uriInfo, request);
    }

    @GET
    @Produces("application/json")
    @Path("image-sets/find")
    public Response findImageSetsForBagId(@QueryParam("bagName") final String bagName, @Context UriInfo uriInfo, @Context HttpServletRequest request) throws IOException {
        if (bagName != null && bagName.contains("'")) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Invalid bagName \"" + bagName + "\"").build();
        }
        return Response.ok().entity(getImageSetsArray(bagName, uriInfo)).build();
    }
    
    private JsonArray getImageSetsArray(String bagName, UriInfo uriInfo) throws IOException {
    	final String sparqlQuery = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "SELECT DISTINCT ?imageSet ?id ?date\n" +
                "WHERE {\n" +
                "  ?imageSet rdf:type <http://ontology.lib.virginia.edu/presentation#ImageSet> .\n" +
                "  ?imageSet <" + DC_ID.getURI() + "> ?id .\n" +
                "  ?imageSet <http://fedora.info/definitions/v4/repository#lastModified> ?date .\n" +
                (bagName != null
                        ? "  ?bag <http://ontology.lib.virginia.edu/preservation#bagName> '" + bagName + "' .\n" +
                          "  ?imageSet <http://pcdm.org/models#hasMember> ?member .\n" +
                          "  ?member <http://fedora.info/definitions/v4/repository#hasParent> ?bag .\n"
                        : "") +
                "} ORDERBY ?date \n";
        final JsonArrayBuilder a = Json.createArrayBuilder();
        for (Map<String, String> set : getTriplestore(uriInfo).getQueryResponse(sparqlQuery)) {
            JsonObjectBuilder o = Json.createObjectBuilder();
            o.add("id", set.get("id"));
            o.add("uri", set.get("imageSet"));
            o.add("date", set.get("date"));;
            a.add(o.build());
        }
        
        return a.build();
    }
    
	@GET
	@Path("/{accessionId: [^/]*}/bags/{bagId: [^/]*}/imageSets")
	public Response listImageSets(@PathParam("accessionId") final String accessionId, @PathParam("bagId") final String bagId, @Context UriInfo uriInfo) throws IOException {
		VelocityContext context = new VelocityContext();
		
		context.put("aname", accessionId);
		context.put("bname", bagId);
		context.put("btitle", getTriplestore(uriInfo).getFirstAndOnlyQueryResponse("PREFIX dc: <http://purl.org/dc/elements/1.1/>\n" +
                "PREFIX pres4: <http://ontology.lib.virginia.edu/preservation#>\n" +
                "SELECT ?title\n" +
                "WHERE {\n" +
                "    ?bag dc:title ?title .\n" +
                "    ?bag pres4:bagName '" + bagId + "' .\n" +
                "}").get("title"));
		
		
		JsonArray array = getImageSetsArray(bagId, uriInfo);
		
		context.put("imageSets", array);
		
		StringWriter w = new StringWriter();
        imageSetsTemplate.merge(context, w);
		return Response.ok().encoding("UTF-8").entity(w.toString()).build();
	}
    
    @GET
    @Produces("application/json")
    @Path("image-sets/{setId: [^/]*}")
    public Response getImageSet(@PathParam("setId") final String setId, @Context UriInfo uriInfo, @Context HttpServletRequest request) throws IOException {
        final String sparqlQuery = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "SELECT ?uri ?filename ?mimetype ?size ?bagName ?prev\n" +
                "WHERE {\n" +
                "  ?imageSet rdf:type <http://ontology.lib.virginia.edu/presentation#ImageSet> .\n" +
                "  ?imageSet <http://purl.org/dc/terms/identifier> '" + setId + "' .\n" +
                "  ?imageSet <http://pcdm.org/models#hasMember> ?uri .\n" +
                "  ?uri <http://fedora.info/definitions/v4/repository#hasParent> ?bag .\n" +
                "  ?uri <http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#filename> ?filename .\n" +
                "  ?uri <http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#hasMimeType> ?mimetype .\n" +
                "  ?uri <http://www.loc.gov/premis/rdf/v1#hasSize> ?size .\n" +
                "  ?bag <http://ontology.lib.virginia.edu/preservation#bagName> ?bagName .\n" +
                "  OPTIONAL {\n" +
                "    ?proxy <http://www.openarchives.org/ore/terms/proxyFor> ?uri .\n" +
                "    ?proxy <http://www.iana.org/assignments/relation/prev> ?prevProxy .\n" +
                "    ?proxy <http://www.openarchives.org/ore/terms/proxyIn> ?imageSet .\n" +
                "    ?prevProxy <http://www.openarchives.org/ore/terms/proxyFor> ?prev .\n" +
                "  }\n" +
                "}";
        final List<Map<String, String>> response = getTriplestore(uriInfo).getQueryResponse(sparqlQuery);

        // Walk through the results once, buidling two maps, one that can be used to
        // derive the order, another that has JsonObjects with the info about each image.
        // Both maps use the id (URI) of the images as keys.
        String first = null;
        Map<String, String> next = new HashMap<String, String>();
        Map<String, JsonObject> data = new HashMap<String, JsonObject>();
        for (Map<String, String> image : response) {
            final String id = image.get("uri");
            final String p = image.get("prev");
            if (p == null || "".equals(p)) {
                first = id;
            } else {
                next.put(p, id);
            }

            JsonObjectBuilder o = Json.createObjectBuilder();
            o.add("uri", id);
            o.add("filename", image.get("filename"));
            o.add("mimetype", image.get("mimetype"));
            o.add("size", image.get("size"));
            o.add("bag", image.get("bagName"));
            data.put(id, o.build());
        }

        JsonArrayBuilder a = Json.createArrayBuilder();
        String nextImage = first;
        while (nextImage != null) {
            a.add(data.get(nextImage));
            nextImage = next.get(nextImage);
        }

        return Response.ok().entity(a.build()).build();
    }

    /**
     * Accepts a JSON Array of identifiers (URIs) for which an image set should be created.
     * @param jsonInput an array of identifiers in json (ie, {@code  [ "http://uri1", "http://uri2", "http://uri3" ] })
     */
    @POST
    @Path("image-sets")
    public Response createOrUpdateImageSet(InputStream jsonInput, @QueryParam("setId") final String imageSetUriStr) {

        JsonReader jsonReader = Json.createReader(jsonInput);
        JsonObject object = jsonReader.readObject();
        JsonArray array = object.getJsonArray("uriList");
        
        Model m = createDefaultModel();
        final Resource collection = createResource("");
        m.add(collection, RDF_TYPE, IMAGE_SET);
        //m.add(collection, DC_ID, createStringLiteral(new BigInteger(130, new SecureRandom()).toString(32)));
        
        //First element in object is the name
        m.add(collection, DC_ID, object.getString("name"));
        
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
            if (i == array.size() - 1) {
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
        try {
        	if (imageSetUriStr == null) {
                // create a new image set
                client.post(imageSetContainer).body(new ByteArrayInputStream(baos.toByteArray()), "text/rdf+n3").perform();
            } else {
            	// replace the existing image set
                final URI uri = new URI(imageSetUriStr);
                client.delete(uri).perform();
                client.delete(new URI(imageSetUriStr + "/fcr:tombstone")).perform();
                client.put(new URI(imageSetUriStr)).body(new ByteArrayInputStream(baos.toByteArray()), "text/rdf+n3").perform();
            }
        } catch (FcrepoOperationFailedException e) {
            e.printStackTrace();
            return Response.serverError().encoding(e.getMessage()).build();
        } catch (URISyntaxException e) {
        	return Response.status(400).entity("setId parameter must be a valid URI!").build();
        }
        return Response.ok().build();
    }

}
