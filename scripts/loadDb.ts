import { DataAPIClient } from "@datastax/astra-db-ts"
// import OpenAI from "openai"
// import 'node-fetch-global/polyfill'
import "cross-fetch/polyfill"
import "web-streams-polyfill/polyfill"
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import "dotenv/config"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
type SimilarityMetric="dot_product"|"cosine"|"euclidean"
import { Document } from "@langchain/core/documents"
import { AstraDBVectorStore } from "@langchain/community/vectorstores/astradb"

const { ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT
, ASTRA_DB_APPLICATION_TOKEN,
    GOOGLE_API_KEY} =process.env

const f1Data=[
    'https://en.wikipedia.org/wiki/Formula_One',
    'https://en.wikipedia.org/wiki/2025_Formula_One_World_Championship',
    'https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers%27_Champions',
    'https://en.wikipedia.org/wiki/2024_Formula_One_World_Championship',
    'https://en.wikipedia.org/wiki/2022_Formula_One_World_Championship'
]

// Add this immediately after the process.env destructuring:

const embeddings = new GoogleGenerativeAIEmbeddings({ // Initialize once
    // This model is generally recommended for RAG tasks.
    apiKey: GOOGLE_API_KEY,
    model: "gemini-embedding-001",
    // Optional: Specify the task type for better performance in RAG
    // taskType: "RETRIEVAL_DOCUMENT"
});
const client= new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db=client.db(ASTRA_DB_API_ENDPOINT,{namespace : ASTRA_DB_NAMESPACE})
const splitter=new RecursiveCharacterTextSplitter({
    chunkSize:512,
    chunkOverlap:100
})

// const createCollection=async (similarityMetric:SimilarityMetric="dot_product") =>{
//     const res=await db.createCollection(ASTRA_DB_COLLECTION,{
//         vector:{
//             dimension :3072,
//             metric : similarityMetric
//         }
//     })
//     console.log(res)
// }

const createCollection=async (similarityMetric:SimilarityMetric="dot_product") =>{
    const collections = await db.listCollections()
    if (collections.some(c => c.name === ASTRA_DB_COLLECTION)) {
        console.log(`Collection '${ASTRA_DB_COLLECTION}' already exists. Skipping creation.`);
        return; // Exit the function gracefully
    }

    const res=await db.createCollection(ASTRA_DB_COLLECTION,{
        vector:{
            dimension :3072,
            metric : similarityMetric
        }
    })
    console.log(`Collection '${ASTRA_DB_COLLECTION}' created successfully.`);
    console.log(res)
}

const loadSampleData=async()=>{
    const collection=await db.collection(ASTRA_DB_COLLECTION)
    for await (const url of f1Data){
        const content= await scrapePage(url)
        const chunks =await splitter.splitText(content)
        for await(const chunk of chunks){
            const vector=await embeddings.embedQuery(chunk)


            const res=await collection.insertOne({
                $vector:vector,
                text:chunk
            })
            console.log(res)

        }
    }
}
const scrapePage=async(url:string)=>{
     const loader=new PuppeteerWebBaseLoader(url,{
         launchOptions:{
             headless:true
         },
         gotoOptions:{
             waitUntil:"domcontentloaded",
             timeout:60000
         },
         evaluate:async (page,browser)=>{
             const result=await page.evaluate(()=>document.body.innerHTML)
             await browser.close()
             return result
         }
     })
    return (await loader.scrape())?.replace(/<[^>]*>?/gm,'')

}

createCollection().then(()=>loadSampleData())





