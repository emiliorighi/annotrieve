"use client"

import CardSwap, { Card } from "./card-swap"
import { Database, Download, Zap, Globe, TextSearch, ChartBar } from "lucide-react"

export function Hero() {
    return (
        <div className="relative min-h-[600px] flex items-center justify-center overflow-hidden bg-primary/10">
            <div className="container mx-auto px-4 py-12">
                <div className="grid lg:grid-cols-[50%_50%] gap-12 items-center">
                    {/* left side - Content */}
                    <div className="space-y-8 flex flex-col justify-center">
                        <div>
                            <h1 className="text-6xl font-semibold text-white mb-6 leading-tight">
                            <span className="text-accent">Annotrieve</span> <br/>  Eukaryotic Genome Annotations in One Place                            </h1>
                            <p className="text-2xl text-gray-300 leading-relaxed">
                            A unified interface for accessing GFF annotations from Ensembl and NCBI across all eukaryotic species. 
            </p>
                        </div>
                    </div>

                    {/* right side - CardSwap */}
                    <div className="relative h-[500px] hidden lg:flex lg:items-end lg:justify-start">
                        <CardSwap
                            width={1000}
                            height={750}
                            cardDistance={30}
                            verticalDistance={40}
                            delay={5000}
                            pauseOnHover={false}
                            easing="linear"
                            skewAmount={0}
                        >
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Database className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Unified Access</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        NCBI RefSeq, GenBank, and Ensembl annotations in one place
                                    </p>
                                </div>
                            </Card>
                            {/* <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Zap className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Stream Features</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Query genes, transcripts, and features dynamically via API
                                    </p>
                                </div>
                            </Card> */}
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Download className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Download</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Download bgzipped annotations in GFF format                                    </p>
                                </div>
                            </Card>
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Globe className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Explore</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Explore thousands of eukaryotic genomes, species, and their annotations
                                    </p>
                                </div>
                            </Card>
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <TextSearch className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">JBrowse2 Integration</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Visualize annotations directly in the genome browser
                                    </p>
                                </div>
                            </Card>
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <ChartBar className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Statistics Dashboard</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Gene counts, biotypes, and feature statistics
                                    </p>
                                </div>
                            </Card>
                        </CardSwap>
                    </div>
                </div>
            </div>
        </div>
    )
}

