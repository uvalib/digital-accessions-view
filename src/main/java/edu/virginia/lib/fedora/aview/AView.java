package edu.virginia.lib.fedora.aview;

import org.apache.http.client.utils.URIBuilder;
import org.apache.velocity.Template;
import org.apache.velocity.VelocityContext;
import org.apache.velocity.app.VelocityEngine;
import org.apache.velocity.runtime.RuntimeConstants;
import org.apache.velocity.runtime.resource.loader.ClasspathResourceLoader;
import org.apache.commons.io.FileUtils;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;

import java.io.File;
import java.io.IOException;
import java.io.StringWriter;
import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.net.URL;

@Path("")
public class AView {

    private Template accessionsTemplate;
    private Template bagsTemplate;
    private Template filesTemplate;

    private DisplayHelper helper;

    private FusekiReader fusekiReader;
    
    private URL url;
    
    public AView() throws URISyntaxException, MalformedURLException {
        helper = new DisplayHelper();

        VelocityEngine ve = new VelocityEngine();
        ve.setProperty(RuntimeConstants.RESOURCE_LOADER, "classpath");
        ve.setProperty("classpath.resource.loader.class", ClasspathResourceLoader.class.getName());
        ve.init();

        accessionsTemplate = ve.getTemplate("accessions.vm");
        bagsTemplate = ve.getTemplate("bags.vm");
        filesTemplate = ve.getTemplate("files.vm");
        
        try {
        	url = new URL (FileUtils.readFileToString(new File("host.txt"), "UTF-8"));
        } catch (IOException e) {
        	System.out.println("Error reading from host.txt, " + (e.getMessage() != null ? e.getMessage() : ""));
        	url = null;
        }
    }

    private String getASpaceURI(UriInfo uriInfo) {
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

    private FusekiReader getTriplestore(UriInfo uriInfo) {
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

    @GET
    @Produces(MediaType.TEXT_HTML)
    public Response listAccessionsHTML(@Context UriInfo uriInfo) throws IOException, URISyntaxException {
        VelocityContext context = new VelocityContext();
        context.put("accessionRoot", getASpaceURI(uriInfo));
        context.put("helper", helper);
    	context.put("accessions", getTriplestore(uriInfo).getQueryResponse("PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "SELECT ?a \n" +
                "WHERE {\n" +
                "  ?a rdf:type <http://ontology.lib.virginia.edu/preservation#Accession> .\n" +
                "} ORDERBY ?a "));

        StringWriter w = new StringWriter();
        accessionsTemplate.merge(context, w);
        return Response.ok().encoding("UTF-8").entity(w.toString()).build();
    }

    @GET
    @Path("/{accessionId: [^/]*}")
    public Response listBags(@PathParam("accessionId") final String accessionId, @Context UriInfo uriInfo) throws IOException {
        VelocityContext context = new VelocityContext();
        context.put("aname", accessionId);
        context.put("helper", helper);
        final String query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "PREFIX premis: <http://www.loc.gov/premis/rdf/v1#>\n" +
                "PREFIX ldp: <http://www.w3.org/ns/ldp#>\n" +
                "PREFIX pres4: <http://ontology.lib.virginia.edu/preservation#>\n" +
                "PREFIX fcrepo: <http://fedora.info/definitions/v4/repository#>\n" +
                "PREFIX dc: <http://purl.org/dc/elements/1.1/>\n" +
                "\n" +
                "SELECT ?bname ?ingestDate ?title\n" +
                "WHERE {\n" +
                "  { \n" +
                "    ?b fcrepo:hasParent <" + getASpaceURI(uriInfo) + "/" + accessionId + ">  . \n" +
                "    ?b pres4:bagName ?bname ." +
                "  }\n" +
                "    OPTIONAL {\n" +
                "      ?b premis:hasEvent ?e .\n" +
                "      ?e premis:hasEventType <http://id.loc.gov/vocabulary/preservationEvents/ingestion> .\n" +
                "      ?e premis:hasEventDateTime ?ingestDate .\n" +
                "      \n" +
                "  } OPTIONAL {\n" +
                "    ?b dc:title ?title .\n" +
                "  }" +
                "}";
        context.put("bags", getTriplestore(uriInfo).getQueryResponse(query));
        StringWriter w = new StringWriter();
        bagsTemplate.merge(context, w);
        return Response.ok().encoding("UTF-8").entity(w.toString()).build();
    }

    @GET
    @Path("/{accessionId: [^/]*}/bags/{bagId: [^/]*}")
    public Response listFiles(@PathParam("accessionId") final String accessionId, @PathParam("bagId") final String bagId, @Context UriInfo uriInfo) throws IOException {
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
        context.put("helper", helper);
        context.put("files", getTriplestore(uriInfo).getQueryResponse("PREFIX premis: <http://www.loc.gov/premis/rdf/v1#>\n" +
                "PREFIX fcrepo: <http://fedora.info/definitions/v4/repository#>\n" +
                "PREFIX dc: <http://purl.org/dc/elements/1.1/>\n" +
                "PREFIX pres4: <http://ontology.lib.virginia.edu/preservation#>\n" +
                "PREFIX ebucore: <http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#>\n" +
                "PREFIX hash: <http://id.loc.gov/vocabulary/preservation/cryptographicHashFunctions/>\n" +
                "\n" +
                "SELECT ?file ?path ?filename ?mime ?size ?sha256 \n" +
                "WHERE { {\n" +
                "    ?bag pres4:bagName '" +  bagId + "' .\n" +
                "    ?file fcrepo:hasParent ?bag .\n" +
                "    ?file pres4:hasLocalPath ?path .\n" +
                "    ?file ebucore:filename ?filename .\n" +
                "    ?file ebucore:hasMimeType ?mime .\n" +
                " } OPTIONAL {\n" +
                "    ?file premis:hasSize ?size .\n" +
                "    ?file hash:sha-256 ?sha256 \n" +
                "} } ORDER BY ?path"));
        StringWriter w = new StringWriter();
        filesTemplate.merge(context, w);
        return Response.ok().encoding("UTF-8").entity(w.toString()).build();
    }
}
