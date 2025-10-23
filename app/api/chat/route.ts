import { DataAPIClient } from "@datastax/astra-db-ts"
import { AstraDBVectorStore } from "@langchain/community/vectorstores/astradb"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import { Document } from "@langchain/core/documents"
// import { convertToModelMessages } from "ai"
import { convertToModelMessages, type UIMessage } from "ai"
// 1. CHANGE: Import the correct functions from the Vercel AI SDK for Gemini
import { GoogleGenerativeAI } from "@ai-sdk/google"
import { StreamingTextResponse, streamText } from "ai"
import "dotenv/config"

// Setup environment variables and database client (copied from loadDb.ts structure)
const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    GOOGLE_API_KEY
} = process.env

// 2. CHANGE: Initialize the Gemini provider
const gemini = new GoogleGenerativeAI({ apiKey: GOOGLE_API_KEY })

// Initialize Astra DB components
const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: GOOGLE_API_KEY,
    model: "gemini-embedding-001",
})
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE })

// Define the system prompt for RAG
const SYSTEM_PROMPT = `You are an AI assistant who knows everything about Formula One.
Use the below context to augment what you know about Formula One racing.
The context will provide you with the most recent page data from wikipedia, the official F1 website and others.
If the context doesnot include the information you need answer based on your existing knowledge and donot mention the source of your information or what the context does or doesn't include.
Format responses using markdown where applicable and donot return images.`

// The API endpoint handler (POST /api/chat)
export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json()
    const latestMessage = messages[messages.length - 1].content

    // 3. RETRIEVE CONTEXT FROM ASTRA DB
    const vectorStore = new AstraDBVectorStore(embeddings, {
        collection: ASTRA_DB_COLLECTION,
        token: ASTRA_DB_APPLICATION_TOKEN,
        endpoint: ASTRA_DB_API_ENDPOINT,
        namespace: ASTRA_DB_NAMESPACE
    })

    // Perform vector search
    const documents = await vectorStore.similaritySearch(latestMessage, 5)

    // Format documents into a context string
    const context = documents.map((doc: Document) => doc.pageContent).join("\n\n")
    // const ragContextPrompt = `CONTEXT: ${context}`
    // 4. PREPARE THE FULL PROMPT WITH CONTEXT
    // const fullPrompt = `CONTEXT: ${context}\n\nUSER QUESTION: ${latestMessage}`
    const combinedSystemPrompt = `${SYSTEM_PROMPT}\n\nCONTEXT: ${context}`
    const messagesForModel = convertToModelMessages(messages);
    // 5. CHANGE: Use the Gemini streamText function from @ai-sdk/google
    const result = await streamText({
        model: gemini.model('gemini-2.5-flash'), // Use a fast Gemini model
        system: combinedSystemPrompt,
        messages: messagesForModel
    })

    // 6. CHANGE: Use StreamingTextResponse for the Vercel AI SDK
    return result.toUIMessageStreamResponse()
}














// import OpenAI from "openai"

// import { DataAPIClient } from "@datastax/astra-db-ts"
// const {
//     ASTRA_DB_NAMESPACE,
//     ASTRA_DB_COLLECTION,
//     ASTRA_DB_API_ENDPOINT,
//     ASTRA_DB_APPLICATION_TOKEN,
//     OΡΕΝΑΙ_API_KEY
// } = process.env

//
// const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
// const ab=client.db(ASTRA_DB_API_ENDPOINT,{namespace:ASTRA_DB_NAMESPACE})
//
// export async function POST(req: Request) {
//     try {
//         const { messages} = await req.json()
//         const latestMessage =messages[messages?.length - 1]?.content
//         let docContext =""
//             I
//         const embedding = await openai.embeddings.create({
//             model: "text-embedding-3-small",
//             input:
//             latestMessage,
//             encoding_format: "float"
//         })
//         try {
//             const collection = await db.collection (ASTRA_DB_COLLECTION)
//             const cursor=collection.find(null, {
//                 sort: {
//                     $vector: embedding.data[0].embedding,
//                 },
//                 limit: 10
//             })
//             const documents=await cursor.toArray()
//             const docsMap=documents?.map(doc=>doc.text)
//             docContext=JSON.stringify(docsMap)
//         }catch (err) {
//             console.log("Error querying db...")
//         }
//         const template = {
//             role: "system",
//             content:
//             `You are an AI assistant who knows everything about Formula One.
//              Use the below context to augment what you know about Formula One racing.
//              The context will provide you with the most recent page data from wikipedia, the official F1 website and others.
//              If the context doesnot include the information you need answer based on your existing knowledge and donot mention the source of your information or what the context does or doesn't include.
//              Format responses using markdown where applicable and donot return images.
//             START CONTEXT
//             ${docContext}
//             END CONTEXT
//             QUESTION: ${latestMessage}`
//
//         const response = await openai.chat.completions.create({
//         model:"gpt-4",
//         stream:true,
//             messages:[template,...messages]
//     }
//         })
//         const stream=OpenAIStream(response)
//         return new StreamingTextResponse(stream)
//
//     } catch (err) {
//     throw err}
// }
//
// }
//
