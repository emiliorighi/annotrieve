import type { TaxonNode, Organism, Assembly, Annotation } from "./types"

export const mockTaxonTree: TaxonNode = {
  id: "eukaryota",
  name: "Eukaryota",
  rank: "superkingdom",
  scientificName: "Eukaryota",
  description: "Organisms whose cells have a nucleus enclosed within a nuclear envelope.",
  annotationCount: 1247,
  children: [
    {
      id: "metazoa",
      name: "Metazoa",
      rank: "kingdom",
      scientificName: "Metazoa",
      commonName: "Animals",
      description: "Multicellular eukaryotic organisms that form the biological kingdom Animalia.",
      annotationCount: 856,
      children: [
        {
          id: "chordata",
          name: "Chordata",
          rank: "phylum",
          scientificName: "Chordata",
          description:
            "Animals possessing a notochord, a hollow dorsal nerve cord, pharyngeal slits, and a post-anal tail.",
          annotationCount: 423,
          children: [
            {
              id: "mammalia",
              name: "Mammalia",
              rank: "class",
              scientificName: "Mammalia",
              commonName: "Mammals",
              description:
                "Vertebrate animals characterized by the presence of mammary glands, hair, and three middle ear bones.",
              annotationCount: 187,
            },
            {
              id: "aves",
              name: "Aves",
              rank: "class",
              scientificName: "Aves",
              commonName: "Birds",
              description:
                "Warm-blooded vertebrates characterized by feathers, toothless beaked jaws, and the laying of hard-shelled eggs.",
              annotationCount: 98,
            },
          ],
        },
        {
          id: "arthropoda",
          name: "Arthropoda",
          rank: "phylum",
          scientificName: "Arthropoda",
          description: "Invertebrate animals with an exoskeleton, segmented body, and paired jointed appendages.",
          annotationCount: 312,
        },
      ],
    },
    {
      id: "viridiplantae",
      name: "Viridiplantae",
      rank: "kingdom",
      scientificName: "Viridiplantae",
      commonName: "Green Plants",
      description: "A clade of eukaryotic organisms made up of the green algae and land plants.",
      annotationCount: 234,
    },
    {
      id: "fungi",
      name: "Fungi",
      rank: "kingdom",
      scientificName: "Fungi",
      description: "Eukaryotic organisms that include microorganisms such as yeasts and molds, as well as mushrooms.",
      annotationCount: 157,
    },
  ],
}

export const mockOrganisms: Organism[] = [
  {
    id: "homo_sapiens",
    scientificName: "Homo sapiens",
    commonName: "Human",
    taxonId: "mammalia",
    taxonName: "Mammalia",
    description:
      "Modern humans are the only extant members of the subtribe Hominina. They are characterized by erect posture and bipedal locomotion, high manual dexterity and heavy tool use, and a general trend toward larger, more complex brains and societies.",
    assemblies: ["GRCh38.p14", "GRCh37.p13"],
    annotationCount: 12,
  },
  {
    id: "mus_musculus",
    scientificName: "Mus musculus",
    commonName: "House Mouse",
    taxonId: "mammalia",
    taxonName: "Mammalia",
    description:
      "The house mouse is a small mammal of the order Rodentia, characteristically having a pointed snout, large rounded ears, and a long and almost hairless tail. It is one of the most abundant species of the genus Mus.",
    assemblies: ["GRCm39", "GRCm38.p6"],
    annotationCount: 8,
  },
  {
    id: "drosophila_melanogaster",
    scientificName: "Drosophila melanogaster",
    commonName: "Fruit Fly",
    taxonId: "arthropoda",
    taxonName: "Arthropoda",
    description:
      "Drosophila melanogaster is a species of fly in the family Drosophilidae. The species is often referred to as the fruit fly or lesser fruit fly, and is one of the most commonly used model organisms in biological research.",
    assemblies: ["BDGP6.32", "BDGP6.28"],
    annotationCount: 6,
  },
]

export const mockAssemblies: Assembly[] = [
  {
    id: "grch38",
    name: "GRCh38.p14",
    accession: "GCA_000001405.29",
    organismId: "homo_sapiens",
    organismName: "Homo sapiens",
    level: "Chromosome",
    releaseDate: "2022-02-03",
    submitter: "Genome Reference Consortium",
    description:
      "The Genome Reference Consortium Human Build 38 patch release 14 (GRCh38.p14) is the latest version of the human reference genome assembly.",
    annotationCount: 6,
  },
  {
    id: "grch37",
    name: "GRCh37.p13",
    accession: "GCA_000001405.14",
    organismId: "homo_sapiens",
    organismName: "Homo sapiens",
    level: "Chromosome",
    releaseDate: "2013-06-28",
    submitter: "Genome Reference Consortium",
    description:
      "The Genome Reference Consortium Human Build 37 patch release 13 (GRCh37.p13) is a previous version of the human reference genome assembly.",
    annotationCount: 6,
  },
  {
    id: "grcm39",
    name: "GRCm39",
    accession: "GCA_000001635.9",
    organismId: "mus_musculus",
    organismName: "Mus musculus",
    level: "Chromosome",
    releaseDate: "2020-06-24",
    submitter: "Genome Reference Consortium",
    description:
      "The Genome Reference Consortium Mouse Build 39 (GRCm39) is the latest version of the mouse reference genome assembly.",
    annotationCount: 4,
  },
]

export const mockAnnotations: Annotation[] = [
  {
    id: "ncbi_homo_sapiens_grch38_1",
    fileName: "GCF_000001405.40_GRCh38.p14_genomic.gff.gz",
    source: "NCBI",
    organism: "Homo sapiens",
    assembly: "GRCh38.p14",
    assemblyAccession: "GCA_000001405.29",
    fileSize: "1.2 GB",
    lastModified: "2022-02-03",
    chromosomes: 25,
    features: {
      genes: 60660,
      transcripts: 228552,
      exons: 1195107,
    },
  },
  {
    id: "ensembl_homo_sapiens_grch38_1",
    fileName: "Homo_sapiens.GRCh38.110.gff3.gz",
    source: "Ensembl",
    organism: "Homo sapiens",
    assembly: "GRCh38.p14",
    assemblyAccession: "GCA_000001405.29",
    fileSize: "1.4 GB",
    lastModified: "2023-07-20",
    chromosomes: 25,
    features: {
      genes: 71408,
      transcripts: 251244,
      exons: 1356890,
    },
  },
  {
    id: "ncbi_homo_sapiens_grch37_1",
    fileName: "GCF_000001405.25_GRCh37.p13_genomic.gff.gz",
    source: "NCBI",
    organism: "Homo sapiens",
    assembly: "GRCh37.p13",
    assemblyAccession: "GCA_000001405.14",
    fileSize: "1.1 GB",
    lastModified: "2013-06-28",
    chromosomes: 25,
    features: {
      genes: 57773,
      transcripts: 196501,
      exons: 1089234,
    },
  },
  {
    id: "ncbi_mus_musculus_grcm39_1",
    fileName: "GCF_000001635.27_GRCm39_genomic.gff.gz",
    source: "NCBI",
    organism: "Mus musculus",
    assembly: "GRCm39",
    assemblyAccession: "GCA_000001635.9",
    fileSize: "892 MB",
    lastModified: "2020-06-24",
    chromosomes: 22,
    features: {
      genes: 55401,
      transcripts: 142689,
      exons: 789234,
    },
  },
  {
    id: "ensembl_mus_musculus_grcm39_1",
    fileName: "Mus_musculus.GRCm39.110.gff3.gz",
    source: "Ensembl",
    organism: "Mus musculus",
    assembly: "GRCm39",
    assemblyAccession: "GCA_000001635.9",
    fileSize: "1.0 GB",
    lastModified: "2023-07-20",
    chromosomes: 22,
    features: {
      genes: 56305,
      transcripts: 149547,
      exons: 823456,
    },
  },
  {
    id: "ncbi_drosophila_bdgp6_1",
    fileName: "GCF_000001215.4_BDGP6.32_genomic.gff.gz",
    source: "NCBI",
    organism: "Drosophila melanogaster",
    assembly: "BDGP6.32",
    assemblyAccession: "GCA_000001215.4",
    fileSize: "45 MB",
    lastModified: "2020-03-11",
    chromosomes: 7,
    features: {
      genes: 17807,
      transcripts: 34762,
      exons: 89234,
    },
  },
]

// Helper function to get taxon path (ancestors)
export function getTaxonPath(taxonId: string, tree: TaxonNode = mockTaxonTree): TaxonNode[] {
  const path: TaxonNode[] = []

  function search(node: TaxonNode): boolean {
    if (node.id === taxonId) {
      path.unshift(node)
      return true
    }

    if (node.children) {
      for (const child of node.children) {
        if (search(child)) {
          path.unshift(node)
          return true
        }
      }
    }

    return false
  }

  search(tree)
  return path
}

// Helper function to find taxon by ID
export function findTaxonById(taxonId: string, tree: TaxonNode = mockTaxonTree): TaxonNode | null {
  if (tree.id === taxonId) return tree

  if (tree.children) {
    for (const child of tree.children) {
      const found = findTaxonById(taxonId, child)
      if (found) return found
    }
  }

  return null
}
