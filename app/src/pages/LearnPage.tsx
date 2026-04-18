import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SchoolIcon from '@mui/icons-material/School';
import FunctionsIcon from '@mui/icons-material/Functions';
import CompareIcon from '@mui/icons-material/Compare';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import StraightenIcon from '@mui/icons-material/Straighten';

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {icon}
      <Typography variant="h6">{title}</Typography>
    </Box>
  );
}

export default function LearnPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Learn About Vector Embeddings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Understand how AI models represent meaning as numbers, and why it matters.
      </Typography>

      {/* What Are Embeddings? */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SectionHeader icon={<SchoolIcon color="primary" />} title="What Are Embeddings?" />
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            An <strong>embedding</strong> is a list of numbers (a vector) that represents the meaning of a piece of
            text. Words, sentences, or entire documents can be converted into embeddings using a trained neural network
            called an <strong>embedding model</strong>.
          </Typography>
          <Typography paragraph>
            The key insight: texts with similar meanings end up with similar vectors. "Dog" and "cat" will have vectors
            pointing in a similar direction, while "dog" and "democracy" will point in very different directions.
          </Typography>
          <Typography paragraph>
            These vectors live in a high-dimensional space &mdash; typically 1,536 or 3,072 dimensions.
            While we can't visualize thousands of dimensions directly, we can measure how similar two vectors are
            using <strong>cosine similarity</strong>, which gives a score from -1 (opposite) to 1 (identical).
          </Typography>
          <Typography>
            Embeddings power search engines, recommendation systems, clustering, anomaly detection, and
            retrieval-augmented generation (RAG) for large language models.
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* How Cosine Similarity Works */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SectionHeader icon={<FunctionsIcon color="primary" />} title="How Cosine Similarity Works" />
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            Cosine similarity measures the angle between two vectors, ignoring their magnitude.
            The formula is:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, textAlign: 'center', fontFamily: 'monospace', fontSize: '1.1rem' }}>
            cos(&theta;) = (A &middot; B) / (||A|| &times; ||B||)
          </Paper>
          <Typography paragraph>
            Where <code>A &middot; B</code> is the dot product and <code>||A||</code> is the vector's magnitude (length).
          </Typography>
          <Typography component="div">
            In practice:
            <ul>
              <li><strong>0.9&ndash;1.0</strong>: Nearly identical meaning (e.g., "doctor" / "physician")</li>
              <li><strong>0.7&ndash;0.9</strong>: Very similar (e.g., "dog" / "cat")</li>
              <li><strong>0.5&ndash;0.7</strong>: Somewhat related (e.g., "dog" / "leash")</li>
              <li><strong>0.3&ndash;0.5</strong>: Loosely connected (e.g., "dog" / "car")</li>
              <li><strong>Below 0.3</strong>: Little to no semantic relationship</li>
            </ul>
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Vector Arithmetic */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SectionHeader icon={<CompareIcon color="primary" />} title="Vector Arithmetic" />
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            One of the most fascinating properties of embeddings is that you can do <strong>arithmetic</strong> with
            them. The classic example from the Word2Vec paper:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, textAlign: 'center', fontFamily: 'monospace', fontSize: '1.1rem' }}>
            king &minus; man + woman &asymp; queen
          </Paper>
          <Typography paragraph>
            This works because the embedding model has learned that the relationship between "king" and "man" is
            analogous to the relationship between "queen" and "woman." Subtracting the "man" direction and adding the
            "woman" direction transforms "king" into something close to "queen."
          </Typography>
          <Typography paragraph>
            Important implementation detail: the Playground does <strong>not</strong> send the full string
            <code> king - man + woman</code> to the embedding model and ask the model to interpret the operators.
            The app parses the expression, generates separate embeddings for each term, and then performs the
            addition and subtraction in code before showing the final comparison.
          </Typography>
          <Typography paragraph>
            Try it in the Playground! Enter <code>king - man + woman</code> as Phrase 1 and <code>queen</code> as Phrase 2,
            then run the same example across all three embedding models. These classic analogy-style examples can vary
            quite a bit by model, and in this playground <code>text-embedding-ada-002</code> often gets closer to the
            expected result than the newer v3 models.
          </Typography>
          <Typography>
            Other examples to try across models:
          </Typography>
          <ul>
            <li><code>paris - france + germany</code> &asymp; berlin</li>
            <li><code>sushi - japan + italy</code> &asymp; pasta or pizza</li>
            <li><code>car - road + water</code> &asymp; boat</li>
          </ul>
        </AccordionDetails>
      </Accordion>

      {/* Dimensionality */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SectionHeader icon={<StraightenIcon color="primary" />} title="Dimensionality Explained" />
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            Each embedding is a vector with a fixed number of dimensions. More dimensions generally means the model can
            capture more nuanced relationships, but at the cost of storage and computation.
          </Typography>
          <Typography paragraph>
            Think of it this way: in 2 dimensions, you can only place words on a flat plane. In 1,536 dimensions,
            the model has 1,536 independent axes to position words, allowing it to encode vastly more subtle
            distinctions &mdash; like the difference between "bank" (financial) and "bank" (river).
          </Typography>
          <Typography>
            The trade-off between dimensions and quality is well studied. OpenAI's newer
            <code> text-embedding-3</code> models support a <code>dimensions</code> parameter that lets you reduce
            the vector size while preserving most of the quality &mdash; a technique called{' '}
            <strong>Matryoshka Representation Learning</strong> (MRL).
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Model Comparison */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SectionHeader icon={<ModelTrainingIcon color="primary" />} title="Embedding Model Comparison" />
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            This playground supports three Azure OpenAI embedding models:
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Model</strong></TableCell>
                  <TableCell align="right"><strong>Dimensions</strong></TableCell>
                  <TableCell><strong>Max Tokens</strong></TableCell>
                  <TableCell><strong>Best For</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><code>text-embedding-ada-002</code></TableCell>
                  <TableCell align="right">1,536</TableCell>
                  <TableCell>8,191</TableCell>
                  <TableCell>Legacy workloads; widely deployed baseline</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><code>text-embedding-3-small</code></TableCell>
                  <TableCell align="right">1,536</TableCell>
                  <TableCell>8,191</TableCell>
                  <TableCell>Cost-effective; better quality than Ada at same dimensions</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><code>text-embedding-3-large</code></TableCell>
                  <TableCell align="right">3,072</TableCell>
                  <TableCell>8,191</TableCell>
                  <TableCell>Highest quality; supports dimension reduction via MRL</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Typography sx={{ mt: 2 }}>
            Try comparing the same phrase pair across all three models to see how they differ.
            That is especially useful for the vector arithmetic examples above: newer models are not automatically
            better at classic analogy tricks, and <code>text-embedding-ada-002</code> can be surprisingly strong.
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Seminal Papers */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SectionHeader icon={<MenuBookIcon color="primary" />} title="Seminal Papers" />
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            The ideas behind modern embeddings build on decades of research. Here are the most influential papers:
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Year</strong></TableCell>
                  <TableCell><strong>Paper</strong></TableCell>
                  <TableCell><strong>Contribution</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>2013</TableCell>
                  <TableCell>
                    <Link href="https://arxiv.org/abs/1301.3781" target="_blank" rel="noopener">
                      Efficient Estimation of Word Representations in Vector Space
                    </Link>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Mikolov, Chen, Corrado, Dean
                    </Typography>
                  </TableCell>
                  <TableCell>
                    Introduced <strong>Word2Vec</strong> (Skip-gram and CBOW). Showed that word vectors capture
                    semantic relationships and support arithmetic (king &minus; man + woman = queen).
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2014</TableCell>
                  <TableCell>
                    <Link href="https://nlp.stanford.edu/pubs/glove.pdf" target="_blank" rel="noopener">
                      GloVe: Global Vectors for Word Representation
                    </Link>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Pennington, Socher, Manning
                    </Typography>
                  </TableCell>
                  <TableCell>
                    Combined global co-occurrence statistics with local context windows.
                    Produced embeddings with strong analogy performance.
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2017</TableCell>
                  <TableCell>
                    <Link href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener">
                      Attention Is All You Need
                    </Link>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin
                    </Typography>
                  </TableCell>
                  <TableCell>
                    Introduced the <strong>Transformer</strong> architecture. The self-attention mechanism is
                    the foundation of all modern embedding models, including the ones available here.
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2019</TableCell>
                  <TableCell>
                    <Link href="https://arxiv.org/abs/1810.04805" target="_blank" rel="noopener">
                      BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding
                    </Link>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Devlin, Chang, Lee, Toutanova
                    </Typography>
                  </TableCell>
                  <TableCell>
                    Showed that <strong>contextual embeddings</strong> &mdash; where the same word gets different
                    vectors depending on context &mdash; dramatically improve downstream NLP tasks.
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2019</TableCell>
                  <TableCell>
                    <Link href="https://arxiv.org/abs/1908.10084" target="_blank" rel="noopener">
                      Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks
                    </Link>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Reimers, Gurevych
                    </Typography>
                  </TableCell>
                  <TableCell>
                    Made it practical to generate <strong>sentence-level embeddings</strong> for
                    similarity comparison at scale, using siamese and triplet networks.
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2022</TableCell>
                  <TableCell>
                    <Link href="https://arxiv.org/abs/2201.10005" target="_blank" rel="noopener">
                      Text and Code Embeddings by Contrastive Pre-Training
                    </Link>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Neelakantan, Xu, Puri, Radford, Han, Tworek, Yuan, Tezak, Kim, Hallacy, et al.
                    </Typography>
                  </TableCell>
                  <TableCell>
                    OpenAI's approach behind their embedding API. Uses <strong>contrastive learning</strong> at
                    scale to produce general-purpose embeddings for text and code.
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2022</TableCell>
                  <TableCell>
                    <Link href="https://arxiv.org/abs/2205.13147" target="_blank" rel="noopener">
                      Matryoshka Representation Learning
                    </Link>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Kusupati, Bhatt, Rber, Saunshi, Khanna, Wettig, Chen, Kumar, et al.
                    </Typography>
                  </TableCell>
                  <TableCell>
                    Enables <strong>flexible-dimension embeddings</strong> where truncating the vector to fewer
                    dimensions preserves most of the quality. Used by OpenAI's v3 embedding models.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
