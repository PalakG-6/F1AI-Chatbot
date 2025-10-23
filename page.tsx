"use client"
import Image from "next/image"
import f1AILogo from "./assets/Logo.png"
import {useChat} from "@ai-sdk/react" //npm i ai
// import {Message} from "ai/react"
import { type Message } from "@ai-sdk/react"
// import { useChat, type Message } from "ai";
import Bubble from "./components/Bubble"
import LoadingBubble from "./components/LoadingBubble"
import PromptSuggestionsRow from "./components/PromptSuggestionsRow"

const Home=()=>{
    const {append,isLoading,messages,input, handleInputChange,handleSubmit}= useChat()
    const noMessages=!messages || messages.length === 0
    const handlePrompt=(promptText)=>{
        const msg : Message={
            id:crypto.randomUUID(),
            content:promptText,
            role:"user"
        }
        append(msg)
    }

    return(
        <main>
            <Image src={f1AILogo} width="250" alt="F1AI Logo" />
            <section className={noMessages ? "":"populated"}>
                {noMessages ? (
                    <>
                        <p className="starter-text">
                        Ask F1AI anything about the topic of F1 racing and it will
                        come back with the most up to date answers.
                        So, how can I help you today?
                        </p>
                        <br/>
                        <PromptSuggestionsRow onPromptClick={handlePrompt}/>
                        </>
                ):(
                    <>
                        {messages.map((message,index)=><Bubble key={`messages-${index}`} message={message}/>)}
                        {isLoading && <LoadingBubble/>}
                    </>
                )}

            </section>
            <form onSubmit={handleSubmit}>
                <input className="questions-box" onChange={handleInputChange} value={input} placeholder="Ask me something..."/>
                <input type="submit"/>

            </form>
        </main>
    )
}
export default Home