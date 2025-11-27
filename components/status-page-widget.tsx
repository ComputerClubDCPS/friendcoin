"use client"

import { useEffect } from "react"

export function StatusPageWidget() {
  useEffect(() => {
    // Load the Atlassian Status Page embed script
    const script = document.createElement("script")
    script.src = "https://amtprojects.statuspage.io/embed/script.js"
    script.async = true
    document.body.appendChild(script)
  }, [])

  return <div id="atlassian-status-page-widget" className="w-full" />
}
