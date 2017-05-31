package edu.virginia.lib.fedora.aview;

import org.junit.Test;

import javax.ws.rs.core.Response;
import java.io.ByteArrayInputStream;
import java.io.UnsupportedEncodingException;

import static org.junit.Assert.assertEquals;

public class ImageSetsTest {


    @Test
    public void test() throws UnsupportedEncodingException {

        Response r = new ImageSets().createImageSet(new ByteArrayInputStream("[ \"http://fedora02.lib.virginia.edu:8080/fcrepo/rest/aspace/VIU_2017_0014/71/4d/66/76/714d6676-a0f4-4be0-843b-b04995e829f4/0e/60/19/ab/0e6019ab-39b2-42cc-9304-e85a03cf351e\", \"http://fedora02.lib.virginia.edu:8080/fcrepo/rest/aspace/VIU_2017_0014/71/4d/66/76/714d6676-a0f4-4be0-843b-b04995e829f4/2a/4a/5d/8a/2a4a5d8a-3141-4758-8d7e-acf4467071bc\" ]".getBytes("UTF-8")));
        assertEquals(200, r.getStatus());
    }

    @Test
    public void testValidSet() throws UnsupportedEncodingException {
        Response r = new ImageSets().createImageSet(new ByteArrayInputStream("[ \"http://fake.fake/\" ]".getBytes("UTF-8")));
        assertEquals(200, r.getStatus());
    }

    @Test
    public void testInvalidSet() throws UnsupportedEncodingException {
        Response r = new ImageSets().createImageSet(new ByteArrayInputStream("[ \"http://valid\", 1 ]".getBytes("UTF-8")));
        assertEquals(400, r.getStatus());
    }
}
