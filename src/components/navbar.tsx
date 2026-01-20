"use client"

import Link from "next/link"

export default function Navbar() {
    return (
        <nav className="flex justify-between items-center p-4">
            <div className="text-2xl font-bold">Pachat</div>
            <div>
                <Link href="/rooms/new">New Room</Link>
            </div>
        </nav>
    )
}