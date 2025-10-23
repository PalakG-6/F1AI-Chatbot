import "./global.css"
export const metadata={
    title:"F1AI",
    description:"All your Formula One questions answered at one place!"

}

const RootLayout=({children})=>{
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    )
}

export default RootLayout;