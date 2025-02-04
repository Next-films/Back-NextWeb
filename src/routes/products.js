import fastify from 'fastify';
import Product from '../models/Products';

export default async function () {
	fastify.get('/products', async (request, reply) => {
		try {
			const products = await Product.query();
			return products;
		} catch (error) {
			reply.status(500).send({ error: 'Something went wrong!' });
		}
	});

	fastify.get('/products/:id', async (request, reply) => {
		try {
			const product = await Product.query().findById(request.params.id);
			if (!product) {
				return reply.status(404).send({ error: 'Product not found' });
			}
			return product;
		} catch (error) {
			reply.status(500).send({ error: 'Something went wrong!' });
		}
	});
}
